"use client";

import * as React from "react";
import { cn } from "cn";

export interface CountdownProps {
  target: string | Date;
  onComplete?: () => void;
  className?: string;
}

interface Remaining {
  totalSeconds: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function diff(target: Date, now: Date): Remaining {
  const totalSeconds = Math.max(
    0,
    Math.floor((target.getTime() - now.getTime()) / 1000),
  );
  return {
    totalSeconds,
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

const MILESTONES = [3600, 600, 60];

/** A live "2d 04h 12m" countdown that switches to seconds in the last hour. */
function Countdown({ target, onComplete, className }: CountdownProps) {
  const targetDate = React.useMemo(
    () => (target instanceof Date ? target : new Date(target)),
    [target],
  );
  const [remaining, setRemaining] = React.useState<Remaining | null>(null);
  const [announcement, setAnnouncement] = React.useState("");
  const firedRef = React.useRef<Set<number>>(new Set());
  const completedRef = React.useRef(false);

  React.useEffect(() => {
    const tick = () => {
      const r = diff(targetDate, new Date());
      setRemaining(r);

      for (const m of MILESTONES) {
        if (r.totalSeconds <= m && !firedRef.current.has(m)) {
          firedRef.current.add(m);
          setAnnouncement(
            m === 3600
              ? "Less than 1 hour left"
              : m === 600
                ? "Less than 10 minutes left"
                : "Less than 1 minute left",
          );
        }
      }

      if (r.totalSeconds === 0 && !completedRef.current) {
        completedRef.current = true;
        onComplete?.();
      }
    };

    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [targetDate, onComplete]);

  return (
    <div className={cn("inline-flex flex-col", className)}>
      <span
        className="font-heading text-lg tabular-nums text-navy sm:text-xl"
        aria-hidden="true"
      >
        {remaining === null ? (
          "—"
        ) : remaining.totalSeconds === 0 ? (
          "0m 00s"
        ) : remaining.totalSeconds < 3600 ? (
          <>
            {pad(remaining.minutes)}m {pad(remaining.seconds)}s
          </>
        ) : (
          <>
            {remaining.days > 0 ? `${remaining.days}d ` : ""}
            {pad(remaining.hours)}h {pad(remaining.minutes)}m
          </>
        )}
      </span>
      <span className="sr-only" role="status" aria-live="polite">
        {announcement}
      </span>
    </div>
  );
}

export { Countdown };
