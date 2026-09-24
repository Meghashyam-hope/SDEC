"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { electionPhase } from "@/lib/election-phase";
import { isEligible, type Eligibility } from "@/lib/eligibility";
import { nominationSchema, type NominationInput } from "@/lib/validators/nominations";

export interface NominationActionResult {
  ok: boolean;
  error?: string;
  id?: string;
}

/**
 * A student applies for a position they're eligible for, during that
 * election's nominations window (SDEC_PLAN §10 Phase 6). Lands as
 * `status='pending'` — only an officer/admin approving it makes it appear
 * anywhere public or on the ballot.
 */
export async function submitNomination(
  positionId: string,
  input: NominationInput,
): Promise<NominationActionResult> {
  const profile = await getCurrentProfile();
  if (!profile) return { ok: false, error: "Sign in to apply." };
  const voter = profile.voters;
  if (!voter) return { ok: false, error: "You're not on the voter roll." };

  const parsed = nominationSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const supabase = await createClient();
  const { data: positionData } = await supabase
    .from("positions")
    .select(
      "id, eligibility, elections(id, slug, eligibility, nominations_open_at, nominations_close_at, starts_at, ends_at, is_published, override, results_published_at)",
    )
    .eq("id", positionId)
    .single();

  if (!positionData) return { ok: false, error: "Position not found" };

  const position = positionData as unknown as {
    id: string;
    eligibility: Eligibility;
    elections: {
      id: string;
      slug: string;
      eligibility: Eligibility;
      nominations_open_at: string | null;
      nominations_close_at: string | null;
      starts_at: string;
      ends_at: string;
      is_published: boolean;
      override: "paused" | "closed_early" | "cancelled" | null;
      results_published_at: string | null;
    } | null;
  };

  if (!position.elections) return { ok: false, error: "Position not found" };
  const election = position.elections;

  const phase = electionPhase(election);
  if (phase !== "nominations") {
    return { ok: false, error: "Nominations aren't open for this election right now." };
  }

  const voterEligibility = { department: voter.department, year: voter.year, section: voter.section };
  if (!isEligible(election.eligibility, voterEligibility) || !isEligible(position.eligibility, voterEligibility)) {
    return { ok: false, error: "You're not eligible for this position." };
  }

  const { data: existing } = await supabase
    .from("candidates")
    .select("id")
    .eq("position_id", positionId)
    .eq("voter_id", voter.id)
    .maybeSingle();
  if (existing) return { ok: false, error: "You've already applied for this position." };

  const { data, error } = await supabase
    .from("candidates")
    .insert({
      position_id: positionId,
      voter_id: voter.id,
      display_name: voter.full_name,
      tagline: parsed.data.tagline,
      manifesto: parsed.data.manifesto,
      photo_path: parsed.data.photo_path ?? null,
      status: "pending",
    })
    .select("id")
    .single();

  if (error || !data) {
    const message = error?.code === "23505" ? "You've already applied for this position." : "Could not submit your application.";
    return { ok: false, error: message };
  }

  revalidatePath(`/nominate/${election.slug}`);
  revalidatePath("/dashboard");
  return { ok: true, id: data.id };
}
