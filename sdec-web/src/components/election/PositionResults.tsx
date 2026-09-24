import Image from "next/image";
import { candidatePhotoUrl } from "@/lib/storage";
import type { PositionResultData } from "@/actions/results";

function Photo({ path, name }: { path: string | null; name: string }) {
  const url = candidatePhotoUrl(path);
  return (
    <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface">
      {url ? (
        <Image src={url} alt="" width={40} height={40} className="size-10 object-cover" unoptimized />
      ) : (
        <span className="text-sm text-caption">{name.charAt(0)}</span>
      )}
    </div>
  );
}

function BarRow({ label, votes, pct, muted }: { label: string; votes: number; pct: number; muted?: boolean }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs text-ink-2">
        <span className={muted ? "text-caption" : undefined}>{label}</span>
        <span className="tabular-nums">
          {votes} · {pct}%
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
        <div
          className={muted ? "h-full rounded-full bg-caption" : "h-full rounded-full bg-navy"}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/** A single position's results: winner card(s) for the top `seats`
 * candidates, horizontal bars for the rest (+ NOTA), and a flagged tie at
 * the seat cutoff (SDEC_PLAN §10 Phase 5). */
function PositionResults({ position }: { position: PositionResultData }) {
  const totalVotes = position.candidates.reduce((sum, c) => sum + c.votes, 0) + position.nota_votes;
  const cutoffVotes = position.candidates[position.seats - 1]?.votes ?? 0;
  const winners = position.candidates.slice(0, position.seats);
  const others = position.candidates.slice(position.seats);
  const tied = cutoffVotes > 0 && others.some((c) => c.votes === cutoffVotes);

  function pct(votes: number) {
    return totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
  }

  return (
    <section className="space-y-3">
      <h3 className="font-heading text-lg font-medium text-ink">{position.title}</h3>
      {tied ? (
        <p className="rounded-lg bg-amber-tint px-3 py-1.5 text-xs font-medium text-amber">
          Tie at the seat cutoff — commission to resolve.
        </p>
      ) : null}

      <div className="grid gap-2.5 sm:grid-cols-2">
        {winners.map((c) => (
          <div
            key={c.candidate_id}
            className="flex items-center gap-3 rounded-2xl border-2 border-teal bg-teal-tint p-3"
          >
            <Photo path={c.photo_path} name={c.display_name} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-ink">{c.display_name}</p>
              <p className="text-xs text-teal">
                {c.votes} votes · {pct(c.votes)}%
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-teal px-2 py-0.5 text-xs font-medium text-white">Elected</span>
          </div>
        ))}
      </div>

      {others.length > 0 || position.nota_votes > 0 ? (
        <div className="space-y-2">
          {others.map((c) => (
            <BarRow key={c.candidate_id} label={c.display_name} votes={c.votes} pct={pct(c.votes)} />
          ))}
          {position.nota_votes > 0 ? (
            <BarRow label="None of the above" votes={position.nota_votes} pct={pct(position.nota_votes)} muted />
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

export { PositionResults };
