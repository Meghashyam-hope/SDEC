import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { electionPhase, type ElectionPhase } from "@/lib/election-phase";
import { isEligible, type Eligibility } from "@/lib/eligibility";
import { formatIst } from "@/lib/ist-time";
import type { Database } from "@/lib/database.types";

export type VoterRow = Database["public"]["Tables"]["voters"]["Row"];
export type ElectionRow = Database["public"]["Tables"]["elections"]["Row"];

export type VoteAccessResult =
  | { ok: true; voter: VoterRow; election: ElectionRow }
  | { ok: false; reason: "signed_out" }
  | { ok: false; reason: "no_voter" }
  | { ok: false; reason: "not_found" }
  | { ok: false; reason: "not_live"; phase: ElectionPhase; election: ElectionRow; voter: VoterRow }
  | { ok: false; reason: "not_eligible"; election: ElectionRow; voter: VoterRow }
  | { ok: false; reason: "already_voted"; election: ElectionRow; voter: VoterRow; votedAt: string };

/**
 * The single source of truth for "can this signed-in student vote in this
 * election right now" — reused by /vote/[slug] and /vote/[slug]/review so
 * the two guard checks can't drift apart. `cast_ballot` re-checks all of
 * this authoritatively; this is just for showing the right screen.
 */
export async function resolveVoteAccess(slug: string): Promise<VoteAccessResult> {
  const profile = await getCurrentProfile();
  if (!profile) return { ok: false, reason: "signed_out" };

  const voter = profile.voters;
  if (!voter) return { ok: false, reason: "no_voter" };

  const supabase = await createClient();
  const { data: election } = await supabase
    .from("elections")
    .select("*")
    .eq("slug", slug)
    .eq("is_published", true)
    .single();
  if (!election) return { ok: false, reason: "not_found" };

  const phase = electionPhase(election);
  if (phase !== "live") return { ok: false, reason: "not_live", phase, election, voter };

  const voterEligibility = { department: voter.department, year: voter.year, section: voter.section };
  if (!isEligible(election.eligibility as unknown as Eligibility, voterEligibility)) {
    return { ok: false, reason: "not_eligible", election, voter };
  }

  const { data: participation } = await supabase
    .from("voter_participation")
    .select("voted_at")
    .eq("election_id", election.id)
    .eq("voter_id", voter.id)
    .maybeSingle();
  if (participation) {
    return { ok: false, reason: "already_voted", election, voter, votedAt: participation.voted_at };
  }

  return { ok: true, voter, election };
}

const NOT_LIVE_MESSAGE: Record<ElectionPhase, string> = {
  draft: "This election isn't open yet.",
  scheduled: "Voting hasn't started yet.",
  nominations: "Nominations are still open — voting hasn't started yet.",
  paused: "Voting is paused right now. Check back soon.",
  ended: "Voting has closed for this election.",
  results: "Voting has closed for this election — results are out.",
  cancelled: "This election was cancelled.",
  live: "",
};

export function voteGuardCopy(
  result: Extract<VoteAccessResult, { ok: false }>,
): { title: string; message: string; displayName?: string } | null {
  switch (result.reason) {
    case "no_voter":
      return {
        title: "You're not on the voter roll",
        message: "Your account isn't linked to a voter record. Contact the election commission.",
      };
    case "not_live":
      return {
        title: result.election.title,
        message: NOT_LIVE_MESSAGE[result.phase],
        displayName: result.voter.full_name,
      };
    case "not_eligible":
      return {
        title: result.election.title,
        message: "You're not eligible to vote in this election.",
        displayName: result.voter.full_name,
      };
    case "already_voted":
      return {
        title: "You've already voted",
        message: `You voted in "${result.election.title}" at ${formatIst(result.votedAt)}. Your receipt was shown once, right after you voted.`,
        displayName: result.voter.full_name,
      };
    default:
      return null;
  }
}
