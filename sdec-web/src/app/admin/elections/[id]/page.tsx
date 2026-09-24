import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getVoterFacets } from "@/actions/elections";
import { getElectionResults, getElectionTurnout } from "@/actions/results";
import { AdminShell } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { PhaseBadge } from "@/components/election/PhaseBadge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { signOut } from "@/actions/auth";
import { electionPhase, isStructurallyLocked } from "@/lib/election-phase";
import { formatIst } from "@/lib/ist-time";
import { ElectionForm } from "@/components/admin/ElectionForm";
import type { Eligibility } from "@/lib/eligibility";
import { PositionsEditor } from "./PositionsEditor";
import type { CandidateData } from "./CandidateList";
import { ElectionControls } from "./ElectionControls";
import { TurnoutPanel } from "./TurnoutPanel";
import { ResultsPanel } from "./ResultsPanel";

export const metadata: Metadata = {
  title: "Election",
};

interface RawPosition {
  id: string;
  title: string;
  description: string | null;
  seats: number;
  max_choices: number;
  eligibility: Eligibility;
  sort_order: number;
  candidates: (CandidateData & { sort_order: number })[];
}

export default async function ElectionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await getCurrentProfile();
  if (!profile || profile.role === "student") redirect("/admin/login");

  const supabase = await createClient();
  const { data: election } = await supabase.from("elections").select("*").eq("id", id).single();
  if (!election) notFound();

  const { data: positionsData } = await supabase
    .from("positions")
    .select(
      "id, title, description, seats, max_choices, eligibility, sort_order, candidates(id, display_name, tagline, manifesto, photo_path, status, voter_id, sort_order)",
    )
    .eq("election_id", id)
    .order("sort_order");

  const rawPositions = (positionsData ?? []) as unknown as RawPosition[];
  const positions = rawPositions
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((p) => ({
      ...p,
      candidates: [...p.candidates].sort((a, b) => a.sort_order - b.sort_order),
    }));

  const { departments, sections } = await getVoterFacets();
  const phase = electionPhase(election);
  const locked = isStructurallyLocked(phase);

  const turnoutResult = await getElectionTurnout(election.id);
  const resultsResult = await getElectionResults(election.id);
  const canPublishResults = (phase === "ended" || phase === "results") && !election.results_published_at;

  return (
    <AdminShell
      actions={
        <form action={signOut}>
          <Button type="submit" variant="ghost" size="sm">
            {profile.display_name ?? "Sign out"}
          </Button>
        </form>
      }
    >
      <div className="space-y-6">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-heading text-2xl font-semibold text-navy">{election.title}</h1>
            <PhaseBadge phase={phase} />
          </div>
          <p className="text-sm text-caption">
            {formatIst(election.starts_at)} → {formatIst(election.ends_at)}
          </p>
        </div>

        <Tabs defaultValue="details">
          <TabsList>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="positions">Positions &amp; candidates</TabsTrigger>
            <TabsTrigger value="turnout">Turnout</TabsTrigger>
            <TabsTrigger value="results">Results</TabsTrigger>
            <TabsTrigger value="controls">Publish &amp; controls</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="pt-4">
            <ElectionForm
              election={{
                id: election.id,
                title: election.title,
                description: election.description,
                starts_at: election.starts_at,
                ends_at: election.ends_at,
                nominations_open_at: election.nominations_open_at,
                nominations_close_at: election.nominations_close_at,
                results_visibility: election.results_visibility,
                allow_nota: election.allow_nota,
                eligibility: (election.eligibility ?? {}) as unknown as Eligibility,
              }}
              departments={departments}
              sections={sections}
              locked={locked}
            />
          </TabsContent>

          <TabsContent value="positions" className="pt-4">
            <PositionsEditor
              electionId={election.id}
              positions={positions}
              departments={departments}
              sections={sections}
              locked={locked}
            />
          </TabsContent>

          <TabsContent value="turnout" className="pt-4">
            {turnoutResult.ok ? (
              <TurnoutPanel electionId={election.id} initial={turnoutResult.data} />
            ) : (
              <p className="text-sm text-caption">{turnoutResult.error}</p>
            )}
          </TabsContent>

          <TabsContent value="results" className="pt-4">
            {resultsResult.ok && turnoutResult.ok ? (
              <ResultsPanel
                electionId={election.id}
                slug={election.slug}
                results={resultsResult.data}
                turnout={turnoutResult.data}
                canPublish={canPublishResults}
              />
            ) : (
              <p className="text-sm text-caption">
                {!resultsResult.ok ? resultsResult.error : "Turnout data isn't available yet."}
              </p>
            )}
          </TabsContent>

          <TabsContent value="controls" className="pt-4">
            <ElectionControls election={{ id: election.id, title: election.title }} phase={phase} />
          </TabsContent>
        </Tabs>
      </div>
    </AdminShell>
  );
}
