"use client";

import * as React from "react";
import { createClient } from "@/lib/supabase/client";
import { TurnoutRing } from "@/components/election/TurnoutRing";
import type { ElectionTurnout } from "@/actions/results";

export interface TurnoutPanelProps {
  electionId: string;
  initial: ElectionTurnout;
}

/** Live turnout via Supabase Realtime on `election_turnout`
 * (SDEC_PLAN §10 Phase 5) — department breakdown stays as the
 * server-rendered snapshot; only the headline count/ring update live. */
function TurnoutPanel({ electionId, initial }: TurnoutPanelProps) {
  const [votesCast, setVotesCast] = React.useState(initial.votes_cast);

  React.useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`election_turnout:${electionId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "election_turnout", filter: `election_id=eq.${electionId}` },
        (payload) => {
          const next = payload.new as { votes_cast?: number };
          if (typeof next.votes_cast === "number") setVotesCast(next.votes_cast);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [electionId]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-6">
        <TurnoutRing votesCast={votesCast} eligibleVoters={initial.eligible_voters} size={140} />
        <div>
          <p className="text-sm text-ink-2">Votes cast</p>
          <p className="font-heading text-3xl tabular-nums text-navy">{votesCast}</p>
          <p className="text-xs text-caption">of {initial.eligible_voters} eligible voters</p>
        </div>
      </div>

      {initial.by_department.length > 0 ? (
        <div className="space-y-2">
          <p className="text-sm font-medium text-ink-2">By department</p>
          {initial.by_department.map((d) => {
            const deptPct = d.eligible > 0 ? Math.round((d.voted / d.eligible) * 100) : 0;
            return (
              <div key={d.department} className="space-y-1">
                <div className="flex items-center justify-between text-xs text-ink-2">
                  <span>{d.department}</span>
                  <span className="tabular-nums">
                    {d.voted}/{d.eligible} · {deptPct}%
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
                  <div className="h-full rounded-full bg-teal" style={{ width: `${deptPct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export { TurnoutPanel };
