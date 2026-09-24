import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/AppHeader";
import { PhaseBadge } from "@/components/election/PhaseBadge";
import { Countdown } from "@/components/election/Countdown";
import { CandidateCard, type CandidateCardData } from "@/components/election/CandidateCard";
import { electionPhase } from "@/lib/election-phase";
import { formatIst } from "@/lib/ist-time";

interface RawPosition {
  id: string;
  title: string;
  description: string | null;
  sort_order: number;
  candidates: (CandidateCardData & { status: string; sort_order: number })[];
}

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
  return { title: election?.title ?? "Election" };
}

export default async function PublicElectionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: election } = await supabase
    .from("elections")
    .select("*")
    .eq("slug", slug)
    .eq("is_published", true)
    .single();
  if (!election) notFound();

  const phase = electionPhase(election);

  const { data: positionsData } = await supabase
    .from("positions")
    .select(
      "id, title, description, sort_order, candidates(id, display_name, tagline, manifesto, photo_path, status, sort_order)",
    )
    .eq("election_id", election.id)
    .order("sort_order");

  const positions = ((positionsData ?? []) as unknown as RawPosition[])
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((p) => ({
      ...p,
      candidates: p.candidates.filter((c) => c.status === "approved").sort((a, b) => a.sort_order - b.sort_order),
    }));

  const countdownTarget =
    phase === "scheduled" || phase === "nominations" ? election.starts_at : phase === "live" ? election.ends_at : null;

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <AppHeader />
      <main className="mx-auto w-full max-w-(--breakpoint-md) flex-1 px-4 py-10 sm:px-6">
        <div className="space-y-3 text-center">
          <PhaseBadge phase={phase} className="mx-auto" />
          <h1 className="font-heading text-3xl font-semibold text-navy">{election.title}</h1>
          {election.description ? (
            <p className="mx-auto max-w-prose text-sm text-ink-2">{election.description}</p>
          ) : null}
          {countdownTarget ? (
            <div className="flex justify-center pt-2">
              <Countdown target={countdownTarget} />
            </div>
          ) : null}
          <p className="text-xs text-caption">
            {formatIst(election.starts_at)} → {formatIst(election.ends_at)}
          </p>
        </div>

        <div className="mt-10 space-y-8">
          {positions.map((p) => (
            <section key={p.id} className="space-y-3">
              <div>
                <h2 className="font-heading text-lg font-medium text-ink">{p.title}</h2>
                {p.description ? <p className="text-sm text-ink-2">{p.description}</p> : null}
              </div>
              <div className="space-y-2.5">
                {p.candidates.map((c) => (
                  <CandidateCard key={c.id} candidate={c} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
