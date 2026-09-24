"use client";

import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { setVoterActive } from "@/actions/voters";

function VoterRowActions({ voterId, isActive }: { voterId: string; isActive: boolean }) {
  const [pending, setPending] = React.useState(false);

  async function toggle() {
    setPending(true);
    const result = await setVoterActive(voterId, !isActive);
    setPending(false);
    if (!result.ok) {
      toast.error("Couldn't update that voter.");
      return;
    }
    toast.success(isActive ? "Voter deactivated" : "Voter reactivated");
  }

  return (
    <Button variant="ghost" size="sm" disabled={pending} onClick={toggle}>
      {isActive ? "Deactivate" : "Reactivate"}
    </Button>
  );
}

export { VoterRowActions };
