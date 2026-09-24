"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Vote } from "lucide-react";
import { deletePosition, reorderPositions } from "@/actions/positions";
import { describeEligibility, type Eligibility } from "@/lib/eligibility";
import { PositionFormDialog } from "./PositionFormDialog";
import { CandidateList, type CandidateData } from "./CandidateList";

export interface PositionData {
  id: string;
  title: string;
  description: string | null;
  seats: number;
  max_choices: number;
  eligibility: Eligibility;
  candidates: CandidateData[];
}

export interface PositionsEditorProps {
  electionId: string;
  positions: PositionData[];
  departments: string[];
  sections: string[];
  locked: boolean;
}

function PositionsEditor({ electionId, positions, departments, sections, locked }: PositionsEditorProps) {
  const router = useRouter();

  async function handleDelete(position: PositionData) {
    if (!confirm(`Delete "${position.title}" and all its candidates?`)) return;
    const result = await deletePosition(position.id, electionId);
    if (!result.ok) {
      toast.error(result.error ?? "Couldn't delete that position");
      return;
    }
    toast.success("Position deleted");
    router.refresh();
  }

  async function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= positions.length) return;
    const ids = positions.map((p) => p.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    const result = await reorderPositions(electionId, ids);
    if (result.ok) router.refresh();
  }

  return (
    <div className="space-y-4">
      {locked ? (
        <p className="rounded-xl border border-amber-tint bg-amber-tint px-3 py-2 text-sm text-amber">
          This election is live or has ended — positions and candidates can no longer be changed.
        </p>
      ) : null}

      {positions.length === 0 ? (
        <EmptyState
          icon={<Vote />}
          title="No positions yet"
          description="Add a position like President or Class Rep to get started."
        />
      ) : (
        <div className="space-y-4">
          {positions.map((position, index) => (
            <Card key={position.id}>
              <CardContent className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-heading text-base font-medium text-ink">{position.title}</p>
                    <p className="text-xs text-caption">
                      {position.seats} seat{position.seats === 1 ? "" : "s"} · pick up to{" "}
                      {position.max_choices} · {describeEligibility(position.eligibility)}
                    </p>
                  </div>
                  {!locked ? (
                    <div className="flex shrink-0 items-center gap-0.5">
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => move(index, -1)}
                        disabled={index === 0}
                        aria-label={`Move ${position.title} up`}
                      >
                        <ChevronUp />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => move(index, 1)}
                        disabled={index === positions.length - 1}
                        aria-label={`Move ${position.title} down`}
                      >
                        <ChevronDown />
                      </Button>
                      <PositionFormDialog
                        electionId={electionId}
                        departments={departments}
                        sections={sections}
                        triggerRender={<Button variant="ghost" size="icon-xs" aria-label={`Edit ${position.title}`} />}
                        triggerLabel={<Pencil />}
                        initial={{
                          id: position.id,
                          title: position.title,
                          description: position.description ?? "",
                          seats: position.seats,
                          max_choices: position.max_choices,
                          eligibility: position.eligibility,
                        }}
                      />
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => handleDelete(position)}
                        aria-label={`Delete ${position.title}`}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  ) : null}
                </div>

                <CandidateList positionId={position.id} candidates={position.candidates} locked={locked} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!locked ? (
        <PositionFormDialog
          electionId={electionId}
          departments={departments}
          sections={sections}
          triggerRender={<Button variant="outline" size="sm" />}
          triggerLabel={
            <>
              <Plus data-icon="inline-start" />
              Add position
            </>
          }
        />
      ) : null}
    </div>
  );
}

export { PositionsEditor };
