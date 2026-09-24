"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireOfficerOrAdmin } from "@/lib/auth";
import { electionPhase, isStructurallyLocked } from "@/lib/election-phase";
import { electionDetailsSchema, type ElectionFormValues } from "@/lib/validators/elections";
import { slugify } from "@/lib/slug";
import type { Eligibility } from "@/lib/eligibility";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export interface ElectionActionResult {
  ok: boolean;
  error?: string;
  id?: string;
}

async function uniqueSlug(
  supabase: SupabaseServerClient,
  title: string,
  excludeId?: string,
): Promise<string> {
  const base = slugify(title);
  let candidate = base;
  for (let i = 2; i < 1000; i++) {
    let query = supabase.from("elections").select("id").eq("slug", candidate);
    if (excludeId) query = query.neq("id", excludeId);
    const { data } = await query.maybeSingle();
    if (!data) return candidate;
    candidate = `${base}-${i}`;
  }
  return `${base}-${crypto.randomUUID().slice(0, 8)}`;
}

export async function createElection(input: ElectionFormValues): Promise<ElectionActionResult> {
  const user = await requireOfficerOrAdmin();
  if (!user) return { ok: false, error: "Not authorized" };

  const parsed = electionDetailsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const supabase = await createClient();
  const slug = await uniqueSlug(supabase, parsed.data.title);

  const { data, error } = await supabase
    .from("elections")
    .insert({
      slug,
      title: parsed.data.title,
      description: parsed.data.description,
      starts_at: parsed.data.starts_at,
      ends_at: parsed.data.ends_at,
      nominations_open_at: parsed.data.nominations_open_at,
      nominations_close_at: parsed.data.nominations_close_at,
      results_visibility: parsed.data.results_visibility,
      allow_nota: parsed.data.allow_nota,
      eligibility: parsed.data.eligibility,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error || !data) return { ok: false, error: error?.message ?? "Could not create election" };

  await supabase.rpc("write_audit_log", {
    p_action: "election.create",
    p_entity: "elections",
    p_entity_id: data.id,
    p_meta: { title: parsed.data.title, slug },
  });

  revalidatePath("/admin/elections");
  redirect(`/admin/elections/${data.id}`);
}

export async function updateElectionDetails(
  id: string,
  input: ElectionFormValues,
): Promise<ElectionActionResult> {
  const user = await requireOfficerOrAdmin();
  if (!user) return { ok: false, error: "Not authorized" };

  const parsed = electionDetailsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const supabase = await createClient();
  const { data: existing, error: fetchError } = await supabase
    .from("elections")
    .select("*")
    .eq("id", id)
    .single();
  if (fetchError || !existing) return { ok: false, error: "Election not found" };

  const locked = isStructurallyLocked(electionPhase(existing));

  const update = locked
    ? { description: parsed.data.description }
    : {
        title: parsed.data.title,
        slug:
          parsed.data.title === existing.title
            ? existing.slug
            : await uniqueSlug(supabase, parsed.data.title, id),
        description: parsed.data.description,
        starts_at: parsed.data.starts_at,
        ends_at: parsed.data.ends_at,
        nominations_open_at: parsed.data.nominations_open_at,
        nominations_close_at: parsed.data.nominations_close_at,
        results_visibility: parsed.data.results_visibility,
        allow_nota: parsed.data.allow_nota,
        eligibility: parsed.data.eligibility,
      };

  const { error } = await supabase.from("elections").update(update).eq("id", id);
  if (error) return { ok: false, error: error.message };

  await supabase.rpc("write_audit_log", {
    p_action: "election.update",
    p_entity: "elections",
    p_entity_id: id,
    p_meta: { locked },
  });

  revalidatePath(`/admin/elections/${id}`);
  revalidatePath("/admin/elections");
  return { ok: true, id };
}

export interface PublishResult {
  ok: boolean;
  errors?: string[];
}

interface PositionWithCandidateStatuses {
  id: string;
  title: string;
  max_choices: number;
  candidates: { status: string }[];
}

/** Publishes a draft election, after checking SDEC_PLAN §10's rule: every
 * position needs >=1 approved candidate, and max_choices <= that count. */
export async function publishElection(id: string): Promise<PublishResult> {
  const user = await requireOfficerOrAdmin();
  if (!user) return { ok: false, errors: ["Not authorized"] };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("positions")
    .select("id, title, max_choices, candidates(status)")
    .eq("election_id", id);

  if (error) return { ok: false, errors: [error.message] };
  const positions = (data ?? []) as unknown as PositionWithCandidateStatuses[];

  const errors: string[] = [];
  if (positions.length === 0) {
    errors.push("Add at least one position before publishing.");
  }
  for (const p of positions) {
    const approved = p.candidates.filter((c) => c.status === "approved").length;
    if (approved === 0) {
      errors.push(`"${p.title}" needs at least one approved candidate.`);
    } else if (p.max_choices > approved) {
      errors.push(
        `"${p.title}" allows ${p.max_choices} choices but only has ${approved} approved candidate${approved === 1 ? "" : "s"}.`,
      );
    }
  }

  if (errors.length > 0) return { ok: false, errors };

  const { error: updateError } = await supabase
    .from("elections")
    .update({ is_published: true })
    .eq("id", id);
  if (updateError) return { ok: false, errors: [updateError.message] };

  await supabase.rpc("write_audit_log", {
    p_action: "election.publish",
    p_entity: "elections",
    p_entity_id: id,
  });

  revalidatePath(`/admin/elections/${id}`);
  revalidatePath("/admin/elections");
  return { ok: true };
}

export type OverrideAction = "pause" | "resume" | "close_early" | "cancel";

const OVERRIDE_VALUE: Record<OverrideAction, "paused" | "closed_early" | "cancelled" | null> = {
  pause: "paused",
  resume: null,
  close_early: "closed_early",
  cancel: "cancelled",
};

const OVERRIDE_AUDIT_ACTION: Record<OverrideAction, string> = {
  pause: "election.pause",
  resume: "election.resume",
  close_early: "election.close_early",
  cancel: "election.cancel",
};

export interface OverrideResult {
  ok: boolean;
  error?: string;
}

/** Every control needs the officer to type the election's exact title,
 * per SDEC_PLAN §10 ("typed confirmation"). */
export async function setElectionOverride(
  id: string,
  action: OverrideAction,
  confirmTitle: string,
): Promise<OverrideResult> {
  const user = await requireOfficerOrAdmin();
  if (!user) return { ok: false, error: "Not authorized" };

  const supabase = await createClient();
  const { data: election, error: fetchError } = await supabase
    .from("elections")
    .select("id, title")
    .eq("id", id)
    .single();
  if (fetchError || !election) return { ok: false, error: "Election not found" };

  if (confirmTitle.trim() !== election.title) {
    return { ok: false, error: "Type the election title exactly to confirm." };
  }

  const { error } = await supabase
    .from("elections")
    .update({ override: OVERRIDE_VALUE[action] })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  await supabase.rpc("write_audit_log", {
    p_action: OVERRIDE_AUDIT_ACTION[action],
    p_entity: "elections",
    p_entity_id: id,
  });

  revalidatePath(`/admin/elections/${id}`);
  revalidatePath("/admin/elections");
  return { ok: true };
}

/** Live "N eligible voters" count for the create/edit form. Mirrors
 * `is_eligible`'s semantics directly against `voters` rather than calling
 * the RPC per row. Only active voters count — matches who can actually
 * cast a ballot. */
export async function countEligibleVoters(eligibility: Eligibility): Promise<number> {
  const user = await requireOfficerOrAdmin();
  if (!user) return 0;

  const supabase = await createClient();
  let query = supabase.from("voters").select("id", { count: "exact", head: true }).eq("is_active", true);
  if (eligibility.departments?.length) query = query.in("department", eligibility.departments);
  if (eligibility.years?.length) query = query.in("year", eligibility.years);
  if (eligibility.sections?.length) query = query.in("section", eligibility.sections);

  const { count } = await query;
  return count ?? 0;
}

export interface VoterFacets {
  departments: string[];
  sections: string[];
}

/** Distinct department/section values on the roll, for the eligibility
 * editor's checkbox lists. */
export async function getVoterFacets(): Promise<VoterFacets> {
  const user = await requireOfficerOrAdmin();
  if (!user) return { departments: [], sections: [] };

  const supabase = await createClient();
  const { data } = await supabase.from("voters").select("department, section");

  const departments = [...new Set((data ?? []).map((v) => v.department))].sort();
  const sections = [...new Set((data ?? []).map((v) => v.section).filter((s): s is string => !!s))].sort();
  return { departments, sections };
}
