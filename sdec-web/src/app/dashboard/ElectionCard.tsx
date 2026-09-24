import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PhaseBadge } from "@/components/election/PhaseBadge";
import { Countdown } from "@/components/election/Countdown";
import type { ElectionPhase } from "@/lib/election-phase";

export interface ElectionCardProps {
  title: string;
  phase: ElectionPhase;
  countdownTarget: string | null;
  voted: boolean;
  ctaHref: string;
  ctaLabel: string;
}

function ElectionCard({ title, phase, countdownTarget, voted, ctaHref, ctaLabel }: ElectionCardProps) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-heading text-base font-medium text-ink">{title}</p>
            <PhaseBadge phase={phase} />
            {voted ? <span className="text-xs font-medium text-teal">Voted ✓</span> : null}
          </div>
          {countdownTarget ? (
            <div className="mt-1">
              <Countdown target={countdownTarget} />
            </div>
          ) : null}
        </div>
        <Button size="sm" render={<Link href={ctaHref} />} nativeButton={false}>
          {ctaLabel}
        </Button>
      </CardContent>
    </Card>
  );
}

export { ElectionCard };
