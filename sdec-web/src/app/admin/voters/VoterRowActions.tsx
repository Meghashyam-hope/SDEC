"use client";

import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { setVoterActive, resetVoterPassword } from "@/actions/voters";

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

  async function resetPassword() {
    setPending(true);
    const result = await resetVoterPassword(voterId);
    setPending(false);
    if (!result.ok || !result.password) {
      toast.error(result.error ?? "Couldn't reset that password.");
      return;
    }
    toast.success(`New password: ${result.password}`, { duration: 30000 });
  }

  return (
    <div className="flex justify-end gap-1">
      <Button variant="ghost" size="sm" disabled={pending} onClick={resetPassword}>
        Reset password
      </Button>
      <Button variant="ghost" size="sm" disabled={pending} onClick={toggle}>
        {isActive ? "Deactivate" : "Reactivate"}
      </Button>
    </div>
  );
}

export { VoterRowActions };
