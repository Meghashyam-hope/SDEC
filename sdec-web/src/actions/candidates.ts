"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireOfficerOrAdmin } from "@/lib/auth";
import { electionPhase, isStructurallyLocked } from "@/lib/election-phase";
import { candidateSchema, type CandidateInput } from "@/lib/validators/candidates";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export interface CandidateActionResult {
  ok: boolean;
  error?: string;
  id?: string;
}

async function getElectionIdForPosition(
  supabase: SupabaseServerClient,
  positionId: string,
): Promise<string | null> {
  const { data } = await supabase.from("positions").select("election_id").eq("id", positionId).single();
  return data?.election_id ?? null;
}

async function assertEditable(supabase: SupabaseServerClient, electionId: string): Promise<string | null> {
  const { data: election } = await supabase.from("elections").select("*").eq("id", electionId).single();
  if (!election) return "Election not found";
  if (isStructurallyLocked(electionPhase(election))) {
    return "This election is live or has ended — candidates can no longer be changed.";
  }
  return null;
}

export async function createCandidate(
  positionId: string,
  input: CandidateInput,
): Promise<CandidateActionResult> {
  const user = await requireOfficerOrAdmin();
  if (!user) return { ok: false, error: "Not authorized" };

  const parsed = candidateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const supabase = await createClient();
  const electionId = await getElectionIdForPosition(supabase, positionId);
  if (!electionId) return { ok: false, error: "Position not found" };
  const lockError = await assertEditable(supabase, electionId);
  if (lockError) return { ok: false, error: lockError };

  const { data: maxRow } = await supabase
    .from("candidates")
    .select("sort_order")
    .eq("position_id", positionId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await supabase
    .from("candidates")
    .insert({
      position_id: positionId,
      voter_id: parsed.data.voter_id ?? null,
      display_name: parsed.data.display_name,
      tagline: parsed.data.tagline,
      manifesto: parsed.data.manifesto,
      photo_path: parsed.data.photo_path ?? null,
      sort_order: (maxRow?.sort_order ?? -1) + 1,
    })
    .select("id")
    .single();

  if (error || !data) return { ok: false, error: error?.message ?? "Could not add candidate" };

  await supabase.rpc("write_audit_log", {
    p_action: "candidate.create",
    p_entity: "candidates",
    p_entity_id: data.id,
    p_meta: { position_id: positionId, display_name: parsed.data.display_name },
  });

  revalidatePath(`/admin/elections/${electionId}`);
  return { ok: true, id: data.id };
}

export async function updateCandidate(
  id: string,
  positionId: string,
  input: CandidateInput,
): Promise<CandidateActionResult> {
  const user = await requireOfficerOrAdmin();
  if (!user) return { ok: false, error: "Not authorized" };

  const parsed = candidateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const supabase = await createClient();
  const electionId = await getElectionIdForPosition(supabase, positionId);
  if (!electionId) return { ok: false, error: "Position not found" };
  const lockError = await assertEditable(supabase, electionId);
  if (lockError) return { ok: false, error: lockError };

  const { error } = await supabase
    .from("candidates")
    .update({
      voter_id: parsed.data.voter_id ?? null,
      display_name: parsed.data.display_name,
      tagline: parsed.data.tagline,
      manifesto: parsed.data.manifesto,
      photo_path: parsed.data.photo_path ?? null,
    })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };

  await supabase.rpc("write_audit_log", {
    p_action: "candidate.update",
    p_entity: "candidates",
    p_entity_id: id,
  });

  revalidatePath(`/admin/elections/${electionId}`);
  return { ok: true, id };
}

export async function deleteCandidate(id: string, positionId: string): Promise<CandidateActionResult> {
  const user = await requireOfficerOrAdmin();
  if (!user) return { ok: false, error: "Not authorized" };

  const supabase = await createClient();
  const electionId = await getElectionIdForPosition(supabase, positionId);
  if (!electionId) return { ok: false, error: "Position not found" };
  const lockError = await assertEditable(supabase, electionId);
  if (lockError) return { ok: false, error: lockError };

  const { error } = await supabase.from("candidates").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  await supabase.rpc("write_audit_log", {
    p_action: "candidate.delete",
    p_entity: "candidates",
    p_entity_id: id,
    p_meta: { position_id: positionId },
  });

  revalidatePath(`/admin/elections/${electionId}`);
  return { ok: true };
}

export async function reorderCandidates(
  positionId: string,
  orderedIds: string[],
): Promise<CandidateActionResult> {
  const user = await requireOfficerOrAdmin();
  if (!user) return { ok: false, error: "Not authorized" };

  const supabase = await createClient();
  const electionId = await getElectionIdForPosition(supabase, positionId);
  if (!electionId) return { ok: false, error: "Position not found" };
  const lockError = await assertEditable(supabase, electionId);
  if (lockError) return { ok: false, error: lockError };

  await Promise.all(
    orderedIds.map((id, index) => supabase.from("candidates").update({ sort_order: index }).eq("id", id)),
  );

  revalidatePath(`/admin/elections/${electionId}`);
  return { ok: true };
}

export interface VoterSearchResult {
  id: string;
  roll_number: string;
  full_name: string;
  department: string;
  year: number;
}

/** For "link to a voter by roll search" in the candidate editor
 * (SDEC_PLAN §10 Phase 3). */
export async function searchVotersForCandidate(query: string): Promise<VoterSearchResult[]> {
  const user = await requireOfficerOrAdmin();
  if (!user || query.trim().length < 2) return [];

  const supabase = await createClient();
  const q = query.trim().replace(/[%_]/g, "");
  const { data } = await supabase
    .from("voters")
    .select("id, roll_number, full_name, department, year")
    .or(`roll_number.ilike.%${q}%,full_name.ilike.%${q}%`)
    .eq("is_active", true)
    .limit(8);

  return data ?? [];
}

/** Approve a pending (or previously rejected) nomination — SDEC_PLAN §10
 * Phase 6. Only `approved` candidates ever appear publicly or on the
 * ballot (candidates_select RLS). */
export async function approveCandidate(id: string, positionId: string): Promise<CandidateActionResult> {
  const user = await requireOfficerOrAdmin();
  if (!user) return { ok: false, error: "Not authorized" };

  const supabase = await createClient();
  const electionId = await getElectionIdForPosition(supabase, positionId);
  if (!electionId) return { ok: false, error: "Position not found" };
  const lockError = await assertEditable(supabase, electionId);
  if (lockError) return { ok: false, error: lockError };

  const { error } = await supabase
    .from("candidates")
    .update({ status: "approved", rejection_reason: null })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  await supabase.rpc("write_audit_log", {
    p_action: "candidate.approve",
    p_entity: "candidates",
    p_entity_id: id,
    p_meta: { position_id: positionId },
  });

  revalidatePath(`/admin/elections/${electionId}`);
  return { ok: true, id };
}

/** Reject a nomination with a reason the applicant can see on their
 * dashboard (SDEC_PLAN §10 Phase 6). */
export async function rejectCandidate(
  id: string,
  positionId: string,
  reason: string,
): Promise<CandidateActionResult> {
  const user = await requireOfficerOrAdmin();
  if (!user) return { ok: false, error: "Not authorized" };
  if (!reason.trim()) return { ok: false, error: "A reason is required" };

  const supabase = await createClient();
  const electionId = await getElectionIdForPosition(supabase, positionId);
  if (!electionId) return { ok: false, error: "Position not found" };
  const lockError = await assertEditable(supabase, electionId);
  if (lockError) return { ok: false, error: lockError };

  const { error } = await supabase
    .from("candidates")
    .update({ status: "rejected", rejection_reason: reason.trim() })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  await supabase.rpc("write_audit_log", {
    p_action: "candidate.reject",
    p_entity: "candidates",
    p_entity_id: id,
    p_meta: { position_id: positionId, reason: reason.trim() },
  });

  revalidatePath(`/admin/elections/${electionId}`);
  return { ok: true, id };
}
