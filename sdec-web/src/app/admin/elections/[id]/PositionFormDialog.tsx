"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { EligibilityEditor } from "@/components/election/EligibilityEditor";
import { createPosition, updatePosition } from "@/actions/positions";
import type { Eligibility } from "@/lib/eligibility";
import type { PositionFormValues as PositionActionInput } from "@/lib/validators/positions";

export interface PositionFormValues {
  id?: string;
  title: string;
  description: string;
  seats: number;
  max_choices: number;
  eligibility: Eligibility;
}

export interface PositionFormDialogProps {
  electionId: string;
  departments: string[];
  sections: string[];
  triggerRender: React.ReactElement;
  triggerLabel: React.ReactNode;
  initial?: PositionFormValues;
}

function PositionFormDialog({
  electionId,
  departments,
  sections,
  triggerRender,
  triggerLabel,
  initial,
}: PositionFormDialogProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [title, setTitle] = React.useState(initial?.title ?? "");
  const [description, setDescription] = React.useState(initial?.description ?? "");
  const [seats, setSeats] = React.useState(initial?.seats ?? 1);
  const [maxChoices, setMaxChoices] = React.useState(initial?.max_choices ?? 1);
  const [eligibility, setEligibility] = React.useState<Eligibility>(initial?.eligibility ?? {});
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  function reset() {
    setTitle(initial?.title ?? "");
    setDescription(initial?.description ?? "");
    setSeats(initial?.seats ?? 1);
    setMaxChoices(initial?.max_choices ?? 1);
    setEligibility(initial?.eligibility ?? {});
    setError(null);
  }

  async function handleSubmit() {
    setSaving(true);
    setError(null);

    const input: PositionActionInput = { title, description, seats, max_choices: maxChoices, eligibility };
    const result = initial?.id
      ? await updatePosition(initial.id, electionId, input)
      : await createPosition(electionId, input);

    setSaving(false);
    if (!result.ok) {
      setError(result.error ?? "Something went wrong");
      return;
    }

    toast.success(initial?.id ? "Position updated" : "Position added");
    setOpen(false);
    if (!initial?.id) reset();
    router.refresh();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger render={triggerRender}>{triggerLabel}</DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{initial?.id ? "Edit position" : "Add position"}</DialogTitle>
          <DialogDescription>e.g. President, or Class Rep with multiple seats.</DialogDescription>
        </DialogHeader>

        <div className="max-h-[65vh] space-y-4 overflow-y-auto pr-1">
          <div className="space-y-1.5">
            <Label htmlFor="position-title">Title</Label>
            <Input id="position-title" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="position-description">Description</Label>
            <Textarea
              id="position-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="position-seats">Seats</Label>
              <Input
                id="position-seats"
                type="number"
                min={1}
                max={20}
                value={seats}
                onChange={(e) => setSeats(Number(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="position-max-choices">Max choices per voter</Label>
              <Input
                id="position-max-choices"
                type="number"
                min={1}
                max={20}
                value={maxChoices}
                onChange={(e) => setMaxChoices(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Who&apos;s eligible for this position</Label>
            <p className="text-xs text-caption">Narrows the election&apos;s own eligibility, if set.</p>
            <EligibilityEditor
              value={eligibility}
              onChange={setEligibility}
              departments={departments}
              sections={sections}
            />
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>

        <DialogFooter>
          <DialogClose render={<Button variant="outline">Cancel</Button>} />
          <Button onClick={handleSubmit} disabled={saving || !title.trim()}>
            {saving ? "Saving…" : initial?.id ? "Save changes" : "Add position"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export { PositionFormDialog };
