"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";

export interface ConfirmOverrideDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  electionTitle: string;
  destructive?: boolean;
  onConfirm: (typedTitle: string) => Promise<{ ok: boolean; error?: string }>;
}

/** Every election control needs the officer to type the election's exact
 * title before it takes effect (SDEC_PLAN §10: "typed confirmation"). */
function ConfirmOverrideDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  electionTitle,
  destructive,
  onConfirm,
}: ConfirmOverrideDialogProps) {
  const [typed, setTyped] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    function reset() {
      setTyped("");
      setError(null);
    }
    if (!open) reset();
  }, [open]);

  async function handleConfirm() {
    setPending(true);
    setError(null);
    const result = await onConfirm(typed);
    setPending(false);

    if (!result.ok) {
      setError(result.error ?? "Something went wrong");
      return;
    }
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5">
          <Label htmlFor="confirm-title">
            Type <span className="font-medium text-ink">{electionTitle}</span> to confirm
          </Label>
          <Input id="confirm-title" value={typed} onChange={(e) => setTyped(e.target.value)} autoFocus />
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <DialogFooter>
          <DialogClose render={<Button variant="outline">Cancel</Button>} />
          <Button
            variant={destructive ? "destructive" : "default"}
            disabled={typed !== electionTitle || pending}
            onClick={handleConfirm}
          >
            {pending ? "Working…" : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export { ConfirmOverrideDialog };
