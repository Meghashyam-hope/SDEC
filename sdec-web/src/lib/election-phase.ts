export type ElectionPhase =
  | "draft"
  | "cancelled"
  | "paused"
  | "nominations"
  | "scheduled"
  | "live"
  | "ended"
  | "results";

export type ElectionOverride = "paused" | "closed_early" | "cancelled" | null;

/**
 * The subset of the `elections` row needed to derive its phase. Mirrors the
 * `election_phase` SQL function (see supabase/migrations) — the two must
 * agree, and election-phase.test.ts asserts that with fixtures shared
 * between both.
 */
export interface ElectionPhaseInput {
  is_published: boolean;
  override: ElectionOverride;
  nominations_open_at: string | Date | null;
  nominations_close_at: string | Date | null;
  starts_at: string | Date;
  ends_at: string | Date;
  results_published_at: string | Date | null;
}

function toDate(value: string | Date | null): Date | null {
  if (value === null) return null;
  return value instanceof Date ? value : new Date(value);
}

export function electionPhase(
  election: ElectionPhaseInput,
  now: Date = new Date(),
): ElectionPhase {
  if (!election.is_published) return "draft";
  if (election.override === "cancelled") return "cancelled";
  if (election.override === "paused") return "paused";
  if (election.results_published_at) return "results";

  const nomOpen = toDate(election.nominations_open_at);
  const nomClose = toDate(election.nominations_close_at);
  if (nomOpen && nomClose && now >= nomOpen && now < nomClose) {
    return "nominations";
  }

  const startsAt = toDate(election.starts_at)!;
  const endsAt = toDate(election.ends_at)!;

  if (now < startsAt) return "scheduled";
  if (now < endsAt && election.override !== "closed_early") return "live";
  return "ended";
}

export const PHASE_LABEL: Record<ElectionPhase, string> = {
  draft: "Draft",
  cancelled: "Cancelled",
  paused: "Paused",
  nominations: "Nominations open",
  scheduled: "Scheduled",
  live: "Live",
  ended: "Ended",
  results: "Results out",
};
