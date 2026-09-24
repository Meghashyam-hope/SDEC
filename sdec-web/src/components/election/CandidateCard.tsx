"use client";

import Image from "next/image";
import { Check } from "lucide-react";
import { cn } from "cn";
import { candidatePhotoUrl } from "@/lib/storage";
import { ManifestoSheet } from "./ManifestoSheet";

export interface CandidateCardData {
  id: string;
  display_name: string;
  tagline: string | null;
  manifesto: string | null;
  photo_path: string | null;
}

export interface CandidateCardProps {
  candidate: CandidateCardData;
  /** Omit for a read-only card (e.g. the public election page). */
  selection?: {
    inputType: "radio" | "checkbox";
    name: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
    disabled?: boolean;
  };
}

/** A candidate ballot card (SDEC_PLAN §8): whole-card tap target, photo,
 * name, tagline, a manifesto sheet, and — when `selection` is given —
 * proper radio/checkbox semantics with a teal selected state. */
function CandidateCard({ candidate, selection }: CandidateCardProps) {
  const photoUrl = candidatePhotoUrl(candidate.photo_path);
  const checked = selection?.checked ?? false;

  const content = (
    <>
      <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-surface-2">
        {photoUrl ? (
          <Image src={photoUrl} alt="" width={64} height={64} className="size-16 object-cover" unoptimized />
        ) : (
          <span className="font-heading text-lg text-caption">{candidate.display_name.charAt(0)}</span>
        )}
      </div>
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="truncate font-medium text-ink">{candidate.display_name}</p>
        {candidate.tagline ? <p className="truncate text-sm text-ink-2">{candidate.tagline}</p> : null}
        {candidate.manifesto ? (
          <ManifestoSheet name={candidate.display_name} manifesto={candidate.manifesto} />
        ) : null}
      </div>
      {checked ? (
        <span className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-teal text-white shadow-sm">
          <Check className="size-3" strokeWidth={3} />
        </span>
      ) : null}
    </>
  );

  if (!selection) {
    return (
      <div className="relative flex min-h-14 items-center gap-3 rounded-2xl border-2 border-border bg-surface p-3">
        {content}
      </div>
    );
  }

  return (
    <label
      className={cn(
        "relative flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border-2 bg-surface p-3 transition-all duration-200 ease-out",
        checked ? "scale-[1.01] border-teal bg-teal-tint" : "border-border hover:border-teal/40",
        selection.disabled && !checked && "cursor-not-allowed opacity-40",
      )}
    >
      <input
        type={selection.inputType}
        name={selection.name}
        checked={checked}
        disabled={selection.disabled && !checked}
        onChange={(e) => selection.onChange(e.target.checked)}
        className="peer sr-only"
      />
      {content}
      <div className="pointer-events-none absolute inset-0 rounded-2xl peer-focus-visible:ring-2 peer-focus-visible:ring-teal peer-focus-visible:ring-offset-2" />
    </label>
  );
}

export { CandidateCard };
