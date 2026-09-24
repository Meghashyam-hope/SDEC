"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CandidateCard } from "@/components/election/CandidateCard";
import { NotaOption } from "@/components/election/NotaOption";
import { loadSelections, saveSelections, type BallotSelectionEntry } from "@/lib/ballot-storage";
import type { BallotPosition } from "@/lib/ballot-positions";

export type { BallotPosition };

export interface BallotStepperProps {
  slug: string;
  allowNota: boolean;
  positions: BallotPosition[];
  initialStep?: number;
}

function emptyEntry(positionId: string): BallotSelectionEntry {
  return { position_id: positionId, is_nota: false, candidate_ids: [] };
}

function isValid(entry: BallotSelectionEntry | undefined, maxChoices: number): boolean {
  if (!entry) return false;
  if (entry.is_nota) return true;
  return entry.candidate_ids.length >= 1 && entry.candidate_ids.length <= maxChoices;
}

function BallotStepper({ slug, allowNota, positions, initialStep = 0 }: BallotStepperProps) {
  const router = useRouter();
  const [step, setStep] = React.useState(initialStep);
  const [selections, setSelections] = React.useState<Record<string, BallotSelectionEntry>>({});
  const [loaded, setLoaded] = React.useState(false);

  React.useEffect(() => {
    function restore() {
      setSelections(loadSelections(slug));
      setLoaded(true);
    }
    restore();
  }, [slug]);

  React.useEffect(() => {
    if (loaded) saveSelections(slug, selections);
  }, [slug, selections, loaded]);

  const position = positions[step];
  const entry = selections[position.id];
  const inputType = position.max_choices > 1 ? "checkbox" : "radio";
  const atMax = (entry?.candidate_ids.length ?? 0) >= position.max_choices;

  function updateEntry(next: BallotSelectionEntry) {
    setSelections((prev) => ({ ...prev, [position.id]: next }));
  }

  function toggleCandidate(candidateId: string, checked: boolean) {
    const current = entry ?? emptyEntry(position.id);
    if (position.max_choices === 1) {
      updateEntry({ position_id: position.id, is_nota: false, candidate_ids: checked ? [candidateId] : [] });
      return;
    }
    const candidateIds = checked
      ? [...current.candidate_ids, candidateId]
      : current.candidate_ids.filter((id) => id !== candidateId);
    updateEntry({ position_id: position.id, is_nota: false, candidate_ids: candidateIds });
  }

  function toggleNota(checked: boolean) {
    updateEntry({ position_id: position.id, is_nota: checked, candidate_ids: [] });
  }

  function goNext() {
    if (step < positions.length - 1) {
      setStep(step + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      router.push(`/vote/${slug}/review`);
    }
  }

  function goBack() {
    if (step === 0) return;
    setStep(step - 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (!loaded) return null;

  const valid = isValid(entry, position.max_choices);

  return (
    <div className="pb-24">
      <div className="sticky top-14 z-30 space-y-1.5 border-b border-border bg-surface/95 px-4 py-3 backdrop-blur sm:px-6">
        <p className="text-xs font-medium text-caption">
          Position {step + 1} of {positions.length} · {position.title}
        </p>
        <Progress value={((step + 1) / positions.length) * 100} />
      </div>

      <div className="mx-auto max-w-(--breakpoint-sm) space-y-4 px-4 py-6 sm:px-6">
        {position.description ? <p className="text-sm text-ink-2">{position.description}</p> : null}
        {position.max_choices > 1 ? (
          <p className="text-sm font-medium text-teal">
            Pick up to {position.max_choices} · {entry?.candidate_ids.length ?? 0}/{position.max_choices} selected
          </p>
        ) : null}

        <div className="space-y-2.5">
          {position.candidates.map((candidate) => (
            <CandidateCard
              key={candidate.id}
              candidate={candidate}
              selection={{
                inputType,
                name: `position-${position.id}`,
                checked: entry?.candidate_ids.includes(candidate.id) ?? false,
                onChange: (checked) => toggleCandidate(candidate.id, checked),
                disabled: inputType === "checkbox" ? atMax : false,
              }}
            />
          ))}

          {allowNota ? (
            <NotaOption
              inputType={inputType}
              name={`position-${position.id}`}
              checked={entry?.is_nota ?? false}
              onChange={toggleNota}
            />
          ) : null}
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 px-4 py-3 backdrop-blur sm:px-6">
        <div className="mx-auto flex max-w-(--breakpoint-sm) items-center gap-2">
          <Button type="button" variant="outline" onClick={goBack} disabled={step === 0}>
            <ChevronLeft data-icon="inline-start" />
            Back
          </Button>
          <Button type="button" className="flex-1" onClick={goNext} disabled={!valid}>
            {step < positions.length - 1 ? "Next" : "Review"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export { BallotStepper };
