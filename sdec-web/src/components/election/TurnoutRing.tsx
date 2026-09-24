export interface TurnoutRingProps {
  votesCast: number;
  eligibleVoters: number;
  size?: number;
}

/** A circular turnout indicator (SDEC_PLAN §8/§10). Pure SVG so it works
 * the same whether the count is live (admin) or a static snapshot
 * (public results page). */
function TurnoutRing({ votesCast, eligibleVoters, size = 120 }: TurnoutRingProps) {
  const pct = eligibleVoters > 0 ? Math.min(100, Math.round((votesCast / eligibleVoters) * 100)) : 0;
  const strokeWidth = Math.max(4, Math.round(size * 0.08));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - pct / 100);
  const compact = size < 90;

  return (
    <div className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--surface-2)" strokeWidth={strokeWidth} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--teal)"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-[stroke-dashoffset] duration-500 ease-out"
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className={compact ? "font-heading text-sm tabular-nums text-navy" : "font-heading text-2xl tabular-nums text-navy"}>
          {pct}%
        </span>
        {compact ? null : (
          <span className="text-xs text-caption">
            {votesCast}/{eligibleVoters}
          </span>
        )}
      </div>
    </div>
  );
}

export { TurnoutRing };
