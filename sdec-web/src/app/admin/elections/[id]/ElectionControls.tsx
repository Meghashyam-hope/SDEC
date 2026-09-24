"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { publishElection, setElectionOverride, type OverrideAction } from "@/actions/elections";
import type { ElectionPhase } from "@/lib/election-phase";
import { ConfirmOverrideDialog } from "./ConfirmOverrideDialog";

const OVERRIDE_COPY: Record<
  OverrideAction,
  { label: string; title: string; description: string; destructive?: boolean }
> = {
  pause: {
    label: "Pause",
    title: "Pause this election",
    description: "Voting stops immediately. Students see the election as paused until you resume it.",
  },
  resume: {
    label: "Resume",
    title: "Resume this election",
    description: "Voting reopens immediately, following the original schedule.",
  },
  close_early: {
    label: "Close early",
    title: "Close voting early",
    description: "Voting ends now, before the scheduled end time. This can't be undone.",
    destructive: true,
  },
  cancel: {
    label: "Cancel election",
    title: "Cancel this election",
    description: "The election is cancelled for good. Any votes already cast still count toward the record, but no results will be published.",
    destructive: true,
  },
};

export interface ElectionControlsProps {
  election: { id: string; title: string };
  phase: ElectionPhase;
}

function ElectionControls({ election, phase }: ElectionControlsProps) {
  const router = useRouter();
  const [publishing, setPublishing] = React.useState(false);
  const [publishErrors, setPublishErrors] = React.useState<string[] | null>(null);
  const [confirmAction, setConfirmAction] = React.useState<OverrideAction | null>(null);

  async function handlePublish() {
    setPublishing(true);
    setPublishErrors(null);
    const result = await publishElection(election.id);
    setPublishing(false);

    if (!result.ok) {
      setPublishErrors(result.errors ?? ["Could not publish"]);
      return;
    }
    toast.success("Election published — eligible students can now see it.");
    router.refresh();
  }

  async function handleOverride(action: OverrideAction, typedTitle: string) {
    const result = await setElectionOverride(election.id, action, typedTitle);
    if (result.ok) {
      toast.success(`Election ${action === "resume" ? "resumed" : OVERRIDE_COPY[action].label.toLowerCase() + "d"}`);
      router.refresh();
    }
    return result;
  }

  const availableActions: OverrideAction[] =
    phase === "paused"
      ? ["resume", "cancel"]
      : phase === "live"
        ? ["pause", "close_early", "cancel"]
        : phase === "scheduled" || phase === "nominations"
          ? ["cancel"]
          : [];

  return (
    <div className="space-y-3">
      {phase === "draft" ? (
        <div className="space-y-2">
          <Button onClick={handlePublish} disabled={publishing}>
            {publishing ? "Publishing…" : "Publish election"}
          </Button>
          {publishErrors ? (
            <ul className="list-inside list-disc rounded-xl bg-red-tint px-3 py-2 text-sm text-red-c">
              {publishErrors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {availableActions.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {availableActions.map((action) => (
            <Button
              key={action}
              variant={OVERRIDE_COPY[action].destructive ? "destructive" : "outline"}
              size="sm"
              onClick={() => setConfirmAction(action)}
            >
              {OVERRIDE_COPY[action].label}
            </Button>
          ))}
        </div>
      ) : null}

      {phase === "ended" || phase === "results" || phase === "cancelled" ? (
        <p className="text-sm text-caption">
          {phase === "cancelled" ? "This election was cancelled." : "Voting has ended for this election."}
        </p>
      ) : null}

      {confirmAction ? (
        <ConfirmOverrideDialog
          open={confirmAction !== null}
          onOpenChange={(open) => !open && setConfirmAction(null)}
          title={OVERRIDE_COPY[confirmAction].title}
          description={OVERRIDE_COPY[confirmAction].description}
          confirmLabel={OVERRIDE_COPY[confirmAction].label}
          destructive={OVERRIDE_COPY[confirmAction].destructive}
          electionTitle={election.title}
          onConfirm={(typedTitle) => handleOverride(confirmAction, typedTitle)}
        />
      ) : null}
    </div>
  );
}

export { ElectionControls };
