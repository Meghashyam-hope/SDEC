"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireOfficerOrAdmin } from "@/lib/auth";

export interface PositionResultCandidate {
  candidate_id: string;
  display_name: string;
  photo_path: string | null;
  votes: number;
}

export interface PositionResultData {
  position_id: string;
  title: string;
  seats: number;
  nota_votes: number;
  candidates: PositionResultCandidate[];
}

export interface ElectionResults {
  election_id: string;
  results_published_at: string | null;
  positions: PositionResultData[];
}

export type ResultsResult = { ok: true; data: ElectionResults } | { ok: false; error: string };

/** Wraps the `get_results` RPC (SDEC_PLAN §6), which does all the
 * visibility gating itself (raises `results_not_available` when it isn't
 * time yet) — this just translates that into a friendly message. */
export async function getElectionResults(electionId: string): Promise<ResultsResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_results", { p_election: electionId });

  if (error) {
    return {
      ok: false,
      error:
        error.message === "results_not_available"
          ? "Results aren't available yet."
          : "Could not load results.",
    };
  }

  return { ok: true, data: data as unknown as ElectionResults };
}

export interface DepartmentTurnout {
  department: string;
  eligible: number;
  voted: number;
}

export interface ElectionTurnout {
  election_id: string;
  eligible_voters: number;
  votes_cast: number;
  by_department: DepartmentTurnout[];
}

export type TurnoutResult = { ok: true; data: ElectionTurnout } | { ok: false; error: string };

export async function getElectionTurnout(electionId: string): Promise<TurnoutResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_turnout", { p_election: electionId });
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: data as unknown as ElectionTurnout };
}

export interface PublishResultsResult {
  ok: boolean;
  error?: string;
}

/** Sets `results_published_at` (one-way — there's no unpublish), audit
 * logged. Gated to officers/admins here; `get_results` itself also allows
 * officers to preview after close before this is ever called. */
export async function publishResults(electionId: string, slug: string): Promise<PublishResultsResult> {
  const user = await requireOfficerOrAdmin();
  if (!user) return { ok: false, error: "Not authorized" };

  const supabase = await createClient();
  const { data: election } = await supabase
    .from("elections")
    .select("results_published_at")
    .eq("id", electionId)
    .single();
  if (!election) return { ok: false, error: "Election not found" };
  if (election.results_published_at) return { ok: false, error: "Results are already published" };

  const { error } = await supabase
    .from("elections")
    .update({ results_published_at: new Date().toISOString() })
    .eq("id", electionId);
  if (error) return { ok: false, error: error.message };

  await supabase.rpc("write_audit_log", {
    p_action: "election.publish_results",
    p_entity: "elections",
    p_entity_id: electionId,
  });

  revalidatePath(`/admin/elections/${electionId}`);
  revalidatePath(`/results/${slug}`);
  return { ok: true };
}
