"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { loadSelections, clearSelections, saveReceipt, type BallotSelectionEntry } from "@/lib/ballot-storage";
import { castBallot } from "@/actions/ballots";
import type { BallotPosition } from "@/lib/ballot-positions";

export interface ReviewSheetProps {
  slug: string;
  positions: BallotPosition[];
}

function ReviewSheet({ slug, positions }: ReviewSheetProps) {
  const router = useRouter();
  const [selections, setSelections] = React.useState<Record<string, BallotSelectionEntry> | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [confirmStep, setConfirmStep] = React.useState(false);

  React.useEffect(() => {
    function restore() {
      setSelections(loadSelections(slug));
    }
    restore();
  }, [slug]);

  if (selections === null) return null;

  const firstIncomplete = positions.find((p) => {
    const entry = selections[p.id];
    return !entry || (!entry.is_nota && entry.candidate_ids.length === 0);
  });

  if (firstIncomplete) {
    return (
      <div className="space-y-4 rounded-2xl border border-dashed border-border bg-surface-2/40 p-6 text-center">
        <p className="text-sm text-ink-2">Looks like you haven&apos;t finished your ballot yet.</p>
        <Button render={<Link href={`/vote/${slug}?position=${firstIncomplete.id}`} />} nativeButton={false}>
          Continue voting
        </Button>
      </div>
    );
  }

  async function handleCast() {
    if (!confirmStep) {
      setConfirmStep(true);
      return;
    }
    setSubmitting(true);
    setError(null);

    const payload = positions.map((p) => {
      const entry = selections![p.id];
      return { position_id: p.id, is_nota: entry.is_nota, candidate_ids: entry.candidate_ids };
    });

    const result = await castBallot(slug, payload);
    setSubmitting(false);

    if (!result.ok || !result.receiptCode) {
      setError(result.error ?? "Something went wrong. Please try again.");
      setConfirmStep(false);
      return;
    }

    clearSelections(slug);
    saveReceipt(slug, result.receiptCode);
    router.push(`/vote/${slug}/done`);
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2.5">
        {positions.map((p) => {
          const entry = selections[p.id];
          const chosen = entry.is_nota
            ? "None of the above"
            : p.candidates
                .filter((c) => entry.candidate_ids.includes(c.id))
                .map((c) => c.display_name)
                .join(", ");
          return (
            <div
              key={p.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface p-3"
            >
              <div className="min-w-0">
                <p className="text-xs font-medium text-caption">{p.title}</p>
                <p className="truncate text-sm font-medium text-ink">{chosen}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                render={<Link href={`/vote/${slug}?position=${p.id}`} />}
                nativeButton={false}
              >
                Edit
              </Button>
            </div>
          );
        })}
      </div>

      <p className="rounded-xl bg-surface-2/60 p-3 text-xs text-ink-2">
        Votes are final and secret. No one, including the commission, can see who you voted for.
      </p>

      {error ? (
        <div className="space-y-1">
          <p className="text-sm text-destructive">{error}</p>
          <Link href="/dashboard" className="text-xs text-teal underline-offset-2 hover:underline">
            Back to dashboard
          </Link>
        </div>
      ) : null}

      <Button className="w-full" onClick={handleCast} disabled={submitting}>
        {submitting ? "Casting your vote…" : confirmStep ? "Tap again to confirm" : "Cast my vote"}
      </Button>
    </div>
  );
}

export { ReviewSheet };
