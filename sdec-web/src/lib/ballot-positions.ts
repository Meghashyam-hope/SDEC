import "server-only";
import { createClient } from "@/lib/supabase/server";
import { isEligible, type Eligibility } from "@/lib/eligibility";
import type { CandidateCardData } from "@/components/election/CandidateCard";

export interface BallotPosition {
  id: string;
  title: string;
  description: string | null;
  seats: number;
  max_choices: number;
  candidates: CandidateCardData[];
}

interface RawPosition {
  id: string;
  title: string;
  description: string | null;
  seats: number;
  max_choices: number;
  eligibility: Eligibility;
  sort_order: number;
  candidates: (CandidateCardData & { status: string; sort_order: number })[];
}

export interface VoterEligibilityForBallot {
  department: string;
  year: number;
  section: string | null;
}

/** Positions (and their approved candidates) a specific voter can see on
 * the ballot: filtered by position-level eligibility, sorted, with only
 * `approved` candidates. Shared by /vote/[slug] and its /review step so
 * they always agree on what's on the ballot. */
export async function getBallotPositions(
  electionId: string,
  voterEligibility: VoterEligibilityForBallot,
): Promise<BallotPosition[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("positions")
    .select(
      "id, title, description, seats, max_choices, eligibility, sort_order, candidates(id, display_name, tagline, manifesto, photo_path, status, sort_order)",
    )
    .eq("election_id", electionId)
    .order("sort_order");

  const rawPositions = (data ?? []) as unknown as RawPosition[];

  return rawPositions
    .filter((p) => isEligible(p.eligibility, voterEligibility))
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((p) => ({
      id: p.id,
      title: p.title,
      description: p.description,
      seats: p.seats,
      max_choices: p.max_choices,
      candidates: p.candidates
        .filter((c) => c.status === "approved")
        .sort((a, b) => a.sort_order - b.sort_order),
    }))
    .filter((p) => p.candidates.length > 0);
}
