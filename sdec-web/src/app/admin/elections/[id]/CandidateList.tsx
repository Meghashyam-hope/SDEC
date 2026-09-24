"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { deleteCandidate, reorderCandidates } from "@/actions/candidates";
import { candidatePhotoUrl } from "@/lib/storage";
import { CandidateFormDialog } from "./CandidateFormDialog";

export interface CandidateData {
  id: string;
  display_name: string;
  tagline: string | null;
  manifesto: string | null;
  photo_path: string | null;
  status: string;
  voter_id: string | null;
}

export interface CandidateListProps {
  positionId: string;
  candidates: CandidateData[];
  locked: boolean;
}

function CandidateList({ positionId, candidates, locked }: CandidateListProps) {
  const router = useRouter();

  async function handleDelete(candidate: CandidateData) {
    if (!confirm(`Remove ${candidate.display_name} from this position?`)) return;
    const result = await deleteCandidate(candidate.id, positionId);
    if (!result.ok) {
      toast.error(result.error ?? "Couldn't remove that candidate");
      return;
    }
    toast.success("Candidate removed");
    router.refresh();
  }

  async function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= candidates.length) return;
    const ids = candidates.map((c) => c.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    const result = await reorderCandidates(positionId, ids);
    if (result.ok) router.refresh();
  }

  return (
    <div className="space-y-2">
      {candidates.length === 0 ? (
        <p className="text-sm text-caption">No candidates yet.</p>
      ) : (
        candidates.map((candidate, index) => {
          const photoUrl = candidatePhotoUrl(candidate.photo_path);
          return (
            <div
              key={candidate.id}
              className="flex items-center gap-3 rounded-xl border border-border bg-surface px-3 py-2"
            >
              <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-2">
                {photoUrl ? (
                  <Image src={photoUrl} alt="" width={40} height={40} className="size-10 object-cover" unoptimized />
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">{candidate.display_name}</p>
                {candidate.tagline ? (
                  <p className="truncate text-xs text-caption">{candidate.tagline}</p>
                ) : null}
              </div>
              {candidate.status !== "approved" ? (
                <Badge variant="secondary">{candidate.status}</Badge>
              ) : null}
              {!locked ? (
                <div className="flex shrink-0 items-center gap-0.5">
                  <Button variant="ghost" size="icon-xs" onClick={() => move(index, -1)} disabled={index === 0}>
                    <ChevronUp />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => move(index, 1)}
                    disabled={index === candidates.length - 1}
                  >
                    <ChevronDown />
                  </Button>
                  <CandidateFormDialog
                    positionId={positionId}
                    triggerRender={<Button variant="ghost" size="icon-xs" />}
                    triggerLabel={<Pencil />}
                    initial={{
                      id: candidate.id,
                      display_name: candidate.display_name,
                      tagline: candidate.tagline ?? "",
                      manifesto: candidate.manifesto ?? "",
                      voter_id: candidate.voter_id,
                      photo_path: candidate.photo_path,
                    }}
                  />
                  <Button variant="ghost" size="icon-xs" onClick={() => handleDelete(candidate)}>
                    <Trash2 />
                  </Button>
                </div>
              ) : null}
            </div>
          );
        })
      )}

      {!locked ? (
        <CandidateFormDialog
          positionId={positionId}
          triggerRender={<Button variant="outline" size="sm" />}
          triggerLabel={
            <>
              <Plus data-icon="inline-start" />
              Add candidate
            </>
          }
        />
      ) : null}
    </div>
  );
}

export { CandidateList };
