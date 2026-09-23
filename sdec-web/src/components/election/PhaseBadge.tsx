import { cn } from "cn";
import type { ElectionPhase } from "@/lib/election-phase";
import { PHASE_LABEL } from "@/lib/election-phase";

const PHASE_STYLE: Record<
  ElectionPhase,
  { dot: string; text: string; bg: string; pulse?: boolean }
> = {
  live: {
    dot: "bg-teal",
    text: "text-teal",
    bg: "bg-teal-tint",
    pulse: true,
  },
  scheduled: { dot: "bg-amber", text: "text-amber", bg: "bg-amber-tint" },
  nominations: { dot: "bg-amber", text: "text-amber", bg: "bg-amber-tint" },
  paused: { dot: "bg-amber", text: "text-amber", bg: "bg-amber-tint" },
  ended: { dot: "bg-caption", text: "text-ink-2", bg: "bg-surface-2" },
  draft: { dot: "bg-caption", text: "text-ink-2", bg: "bg-surface-2" },
  cancelled: { dot: "bg-red-c", text: "text-red-c", bg: "bg-red-tint" },
  results: { dot: "bg-navy", text: "text-navy", bg: "bg-surface-2" },
};

export interface PhaseBadgeProps {
  phase: ElectionPhase;
  className?: string;
}

function PhaseBadge({ phase, className }: PhaseBadgeProps) {
  const style = PHASE_STYLE[phase];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        style.bg,
        style.text,
        className,
      )}
    >
      <span className="relative flex size-1.5">
        {style.pulse ? (
          <span
            className={cn(
              "absolute inline-flex h-full w-full animate-ping rounded-full opacity-75",
              style.dot,
            )}
          />
        ) : null}
        <span
          className={cn("relative inline-flex size-1.5 rounded-full", style.dot)}
        />
      </span>
      {PHASE_LABEL[phase]}
    </span>
  );
}

export { PhaseBadge };
