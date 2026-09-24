import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/AppHeader";
import { TurnoutRing } from "@/components/election/TurnoutRing";
import { PositionResults } from "@/components/election/PositionResults";
import { getElectionResults, getElectionTurnout } from "@/actions/results";
import { ShareButton } from "./ShareButton";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: election } = await supabase
    .from("elections")
    .select("title")
    .eq("slug", slug)
    .eq("is_published", true)
    .single();

  if (!election) return { title: "Results" };
  return {
    title: `${election.title} — Results`,
    openGraph: { images: [`/api/og/${slug}`] },
  };
}

export default async function PublicResultsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: election } = await supabase
    .from("elections")
    .select("id, title")
    .eq("slug", slug)
    .eq("is_published", true)
    .single();
  if (!election) notFound();

  const [resultsResult, turnoutResult] = await Promise.all([
    getElectionResults(election.id),
    getElectionTurnout(election.id),
  ]);

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <AppHeader />
      <main className="mx-auto w-full max-w-(--breakpoint-md) flex-1 px-4 py-10 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-heading text-2xl font-semibold text-navy">{election.title}</h1>
          <ShareButton title={`${election.title} — Results`} />
        </div>

        {!resultsResult.ok ? (
          <div className="mt-10 rounded-2xl border border-dashed border-border bg-surface-2/40 px-6 py-10 text-center">
            <p className="text-sm text-ink-2">{resultsResult.error}</p>
          </div>
        ) : (
          <div className="mt-8 space-y-8">
            {turnoutResult.ok ? (
              <div className="flex items-center gap-4">
                <TurnoutRing
                  votesCast={turnoutResult.data.votes_cast}
                  eligibleVoters={turnoutResult.data.eligible_voters}
                />
                <p className="text-sm text-ink-2">of eligible voters cast a ballot</p>
              </div>
            ) : null}

            <div className="space-y-8">
              {resultsResult.data.positions.map((p) => (
                <PositionResults key={p.position_id} position={p} />
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
