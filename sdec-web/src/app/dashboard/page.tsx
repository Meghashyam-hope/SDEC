import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Vote } from "lucide-react";
import { signOut } from "@/actions/auth";
import { electionPhase, type ElectionPhase } from "@/lib/election-phase";
import { isEligible, type Eligibility } from "@/lib/eligibility";
import type { Database } from "@/lib/database.types";
import { ElectionCard } from "./ElectionCard";

export const metadata: Metadata = {
  title: "Dashboard",
};

type ElectionRow = Database["public"]["Tables"]["elections"]["Row"];

interface CardItem {
  id: string;
  title: string;
  phase: ElectionPhase;
  countdownTarget: string | null;
  voted: boolean;
  ctaHref: string;
  ctaLabel: string;
}

function toCardItem(election: ElectionRow, phase: ElectionPhase, voted: boolean): CardItem {
  const countdownTarget =
    phase === "scheduled" || phase === "nominations"
      ? election.starts_at
      : phase === "live"
        ? election.ends_at
        : null;
  const canVoteNow = phase === "live" && !voted;

  return {
    id: election.id,
    title: election.title,
    phase,
    countdownTarget,
    voted,
    ctaHref: canVoteNow ? `/vote/${election.slug}` : `/elections/${election.slug}`,
    ctaLabel: canVoteNow ? "Vote now" : "View details",
  };
}

function Section({ title, items }: { title: string; items: CardItem[] }) {
  if (items.length === 0) return null;
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-medium text-ink-2">{title}</h2>
      <div className="space-y-2.5">
        {items.map((item) => (
          <ElectionCard key={item.id} {...item} />
        ))}
      </div>
    </section>
  );
}

export default async function DashboardPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const voter = profile.voters;

  const live: CardItem[] = [];
  const upcoming: CardItem[] = [];
  const voted: CardItem[] = [];
  const ended: CardItem[] = [];

  if (voter) {
    const supabase = await createClient();
    const [{ data: elections }, { data: participation }] = await Promise.all([
      supabase.from("elections").select("*").eq("is_published", true),
      supabase.from("voter_participation").select("election_id, voted_at").eq("voter_id", voter.id),
    ]);

    const votedMap = new Map((participation ?? []).map((p) => [p.election_id, p.voted_at]));
    const voterEligibility = { department: voter.department, year: voter.year, section: voter.section };

    for (const election of elections ?? []) {
      if (!isEligible(election.eligibility as unknown as Eligibility, voterEligibility)) continue;

      const phase = electionPhase(election);
      const hasVoted = votedMap.has(election.id);
      const item = toCardItem(election, phase, hasVoted);

      if (hasVoted) voted.push(item);
      else if (phase === "live" || phase === "paused") live.push(item);
      else if (phase === "scheduled" || phase === "nominations") upcoming.push(item);
      else ended.push(item);
    }
  }

  const total = live.length + upcoming.length + voted.length + ended.length;

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <AppHeader session={{ displayName: voter?.full_name ?? "My profile", href: "/dashboard" }} />
      <main className="mx-auto w-full max-w-(--breakpoint-md) flex-1 px-4 py-10 sm:px-6">
        <h1 className="font-heading text-2xl font-semibold text-navy">
          {voter ? `Hi, ${voter.full_name.split(" ")[0]}` : "Hi there"}
        </h1>
        <p className="mt-1 text-sm text-caption">
          {voter
            ? `${voter.roll_number} · ${voter.department}, Year ${voter.year}`
            : "You're signed in, but you're not on the voter roll — contact the election commission."}
        </p>

        {voter ? (
          <div className="mt-8 space-y-8">
            {total === 0 ? (
              <EmptyState
                icon={<Vote />}
                title="No elections yet"
                description="Check back once the commission publishes one you're eligible for."
              />
            ) : (
              <>
                <Section title="Live now" items={live} />
                <Section title="Upcoming" items={upcoming} />
                <Section title="Voted" items={voted} />
                <Section title="Ended" items={ended} />
              </>
            )}
          </div>
        ) : null}

        <form action={signOut} className="mt-10">
          <Button type="submit" variant="outline" size="sm">
            Sign out
          </Button>
        </form>
      </main>
    </div>
  );
}
