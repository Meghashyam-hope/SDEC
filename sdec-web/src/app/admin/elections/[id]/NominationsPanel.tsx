"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { approveCandidate, rejectCandidate } from "@/actions/candidates";
import { candidatePhotoUrl } from "@/lib/storage";

export interface NominationItem {
  id: string;
  positionId: string;
  positionTitle: string;
  displayName: string;
  tagline: string | null;
  photoPath: string | null;
  status: string;
  rejectionReason: string | null;
}

export interface NominationsPanelProps {
  items: NominationItem[];
  locked: boolean;
}

function NominationsPanel({ items, locked }: NominationsPanelProps) {
  const router = useRouter();
  const [rejecting, setRejecting] = React.useState<NominationItem | null>(null);
  const [reason, setReason] = React.useState("");
  const [pendingId, setPendingId] = React.useState<string | null>(null);

  const pending = items.filter((i) => i.status === "pending");
  const reviewed = items.filter((i) => i.status !== "pending");

  async function handleApprove(item: NominationItem) {
    setPendingId(item.id);
    const result = await approveCandidate(item.id, item.positionId);
    setPendingId(null);
    if (!result.ok) {
      toast.error(result.error ?? "Couldn't approve that nomination");
      return;
    }
    toast.success(`${item.displayName} approved`);
    router.refresh();
  }

  async function handleReject() {
    if (!rejecting || !reason.trim()) return;
    setPendingId(rejecting.id);
    const result = await rejectCandidate(rejecting.id, rejecting.positionId, reason);
    setPendingId(null);
    if (!result.ok) {
      toast.error(result.error ?? "Couldn't reject that nomination");
      return;
    }
    toast.success(`${rejecting.displayName} rejected`);
    setRejecting(null);
    setReason("");
    router.refresh();
  }

  return (
    <div className="space-y-8">
      {locked ? (
        <p className="rounded-xl border border-amber-tint bg-amber-tint px-3 py-2 text-sm text-amber">
          This election is live or has ended — nominations can no longer be reviewed.
        </p>
      ) : null}

      <div className="space-y-3">
        <p className="text-sm font-medium text-ink-2">Pending review</p>
        {pending.length === 0 ? (
          <EmptyState title="Nothing to review" description="New applications will show up here." />
        ) : (
          pending.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3"
            >
              <Photo path={item.photoPath} name={item.displayName} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">{item.displayName}</p>
                <p className="text-xs text-caption">{item.positionTitle}</p>
                {item.tagline ? <p className="truncate text-xs text-ink-2">{item.tagline}</p> : null}
              </div>
              {!locked ? (
                <div className="flex shrink-0 gap-1.5">
                  <Button
                    size="icon-sm"
                    variant="outline"
                    onClick={() => handleApprove(item)}
                    disabled={pendingId === item.id}
                  >
                    <Check />
                  </Button>
                  <Button
                    size="icon-sm"
                    variant="outline"
                    onClick={() => setRejecting(item)}
                    disabled={pendingId === item.id}
                  >
                    <X />
                  </Button>
                </div>
              ) : null}
            </div>
          ))
        )}
      </div>

      {reviewed.length > 0 ? (
        <div className="space-y-3">
          <p className="text-sm font-medium text-ink-2">Reviewed</p>
          {reviewed.map((item) => (
            <div key={item.id} className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3">
              <Photo path={item.photoPath} name={item.displayName} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">{item.displayName}</p>
                <p className="text-xs text-caption">{item.positionTitle}</p>
                {item.status === "rejected" && item.rejectionReason ? (
                  <p className="text-xs text-red-c">{item.rejectionReason}</p>
                ) : null}
              </div>
              {item.status === "approved" ? (
                <Badge className="bg-teal-tint text-teal">Approved</Badge>
              ) : (
                <Badge variant="destructive">Rejected</Badge>
              )}
            </div>
          ))}
        </div>
      ) : null}

      <Dialog open={!!rejecting} onOpenChange={(open) => !open && setRejecting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject {rejecting?.displayName}</DialogTitle>
            <DialogDescription>They&apos;ll see this reason on their dashboard.</DialogDescription>
          </DialogHeader>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="e.g. Missing required manifesto details"
            autoFocus
          />
          <DialogFooter>
            <DialogClose render={<Button variant="outline">Cancel</Button>} />
            <Button variant="destructive" onClick={handleReject} disabled={!reason.trim() || pendingId === rejecting?.id}>
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Photo({ path, name }: { path: string | null; name: string }) {
  const url = candidatePhotoUrl(path);
  return (
    <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-2">
      {url ? (
        <Image src={url} alt="" width={40} height={40} className="size-10 object-cover" unoptimized />
      ) : (
        <span className="text-sm text-caption">{name.charAt(0)}</span>
      )}
    </div>
  );
}

export { NominationsPanel };
