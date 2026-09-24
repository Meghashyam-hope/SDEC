import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { TurnoutRing } from "@/components/election/TurnoutRing";
import { createClient } from "@/lib/supabase/server";
import { getElectionTurnout } from "@/actions/results";
import { electionPhase } from "@/lib/election-phase";

export default async function Home() {
  const supabase = await createClient();
  const { data: elections } = await supabase.from("elections").select("*").eq("is_published", true);

  const live = (elections ?? []).filter((e) => electionPhase(e) === "live");
  const liveWithTurnout = await Promise.all(
    live.map(async (election) => {
      const turnout = await getElectionTurnout(election.id);
      return { election, turnout: turnout.ok ? turnout.data : null };
    }),
  );

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <AppHeader />
      <main className="mx-auto flex w-full max-w-(--breakpoint-md) flex-1 flex-col items-center px-6 py-24 text-center">
        <p className="mb-3 text-sm font-medium text-teal">
          Student Digital Election Commission
        </p>
        <h1 className="font-heading text-4xl font-semibold text-navy sm:text-5xl">
          Elections you can trust.
        </h1>
        <p className="mt-4 max-w-md text-balance text-base text-ink-2">
          Vote once, get a receipt that proves it was counted — without
          revealing your choice. Calm, quiet and impossible to get wrong.
        </p>

        {liveWithTurnout.length > 0 ? (
          <div className="mt-12 w-full space-y-3">
            <p className="text-sm font-medium text-ink-2">Live now</p>
            {liveWithTurnout.map(({ election, turnout }) => (
              <Link
                key={election.id}
                href={`/elections/${election.slug}`}
                className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-surface p-4 text-left transition-colors hover:bg-surface-2/60"
              >
                <span className="font-heading text-base font-medium text-ink">{election.title}</span>
                {turnout ? (
                  <TurnoutRing votesCast={turnout.votes_cast} eligibleVoters={turnout.eligible_voters} size={56} />
                ) : null}
              </Link>
            ))}
          </div>
        ) : null}
      </main>
    </div>
  );
}
