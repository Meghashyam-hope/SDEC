"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/database.types";

export interface CastBallotSelection {
  position_id: string;
  is_nota: boolean;
  candidate_ids: string[];
}

export interface CastBallotResult {
  ok: boolean;
  receiptCode?: string;
  error?: string;
}

/** Maps `cast_ballot`'s `raise exception '<code>'` messages (SDEC_PLAN §6)
 * to copy a student should actually see. */
const FRIENDLY_ERROR: Record<string, string> = {
  not_a_voter: "You're not linked to a voter record. Contact the election commission.",
  voter_inactive: "Your voter record is inactive. Contact the election commission.",
  election_not_found: "That election couldn't be found.",
  election_not_live: "Voting isn't open for this election right now.",
  not_eligible: "You're not eligible to vote in this election.",
  invalid_selections: "Your selections didn't match what was expected — please review and try again.",
  already_voted: "You've already voted in this election.",
  nota_not_allowed: "\"None of the above\" isn't allowed for this election.",
  receipt_generation_failed: "Something went wrong generating your receipt. Please try again.",
};

function friendlyError(message: string | undefined): string {
  return (message && FRIENDLY_ERROR[message]) ?? "Something went wrong casting your vote. Please try again.";
}

/** The only code path that writes a vote (SDEC_PLAN §11 rule 1) — this
 * just resolves the slug and calls the `cast_ballot` RPC, which does every
 * real check (phase, eligibility, selection shape, double-voting). */
export async function castBallot(
  slug: string,
  selections: CastBallotSelection[],
): Promise<CastBallotResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in to vote." };

  const { data: election, error: electionError } = await supabase
    .from("elections")
    .select("id")
    .eq("slug", slug)
    .single();
  if (electionError || !election) return { ok: false, error: "That election couldn't be found." };

  const { data: receiptCode, error } = await supabase.rpc("cast_ballot", {
    p_election: election.id,
    p_selections: selections as unknown as Json,
  });

  if (error || !receiptCode) return { ok: false, error: friendlyError(error?.message) };

  revalidatePath("/dashboard");
  return { ok: true, receiptCode };
}
