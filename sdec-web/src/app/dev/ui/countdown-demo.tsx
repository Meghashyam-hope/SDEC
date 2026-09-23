"use client";

import * as React from "react";
import { Countdown } from "@/components/election/Countdown";

export function DevUiCountdownDemo() {
  const [targets, setTargets] = React.useState<{
    inOneHour: Date;
    inTwoDays: Date;
  } | null>(null);

  React.useEffect(() => {
    function computeTargets() {
      const now = Date.now();
      setTargets({
        inOneHour: new Date(now + 55 * 60 * 1000),
        inTwoDays: new Date(now + 2 * 86400 * 1000 + 4 * 3600 * 1000),
      });
    }
    computeTargets();
  }, []);

  if (!targets) return null;

  return (
    <div className="flex flex-wrap gap-8 rounded-2xl border border-border bg-surface p-6">
      <div>
        <p className="mb-1 text-xs text-caption">2 days out</p>
        <Countdown target={targets.inTwoDays} />
      </div>
      <div>
        <p className="mb-1 text-xs text-caption">Inside the last hour (seconds)</p>
        <Countdown target={targets.inOneHour} />
      </div>
    </div>
  );
}
