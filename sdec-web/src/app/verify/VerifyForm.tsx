"use client";

import * as React from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { verifyReceipt, type VerifyReceiptResult } from "@/actions/verify";

function VerifyForm() {
  const [code, setCode] = React.useState("");
  const [checking, setChecking] = React.useState(false);
  const [result, setResult] = React.useState<VerifyReceiptResult | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setChecking(true);
    setResult(null);
    const outcome = await verifyReceipt(code.trim());
    setChecking(false);
    setResult(outcome);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Input
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        placeholder="e.g. 7K4M9X2P6QRT"
        maxLength={12}
        className="text-center font-heading text-lg tracking-[0.15em]"
        autoFocus
      />
      <Button type="submit" className="w-full" disabled={checking || !code.trim()}>
        {checking ? "Checking…" : "Verify"}
      </Button>

      {result ? (
        <div
          className={
            result.found
              ? "flex items-center justify-center gap-2 rounded-xl bg-teal-tint px-3 py-2 text-sm text-teal"
              : "flex items-center justify-center gap-2 rounded-xl bg-red-tint px-3 py-2 text-sm text-red-c"
          }
        >
          {result.found ? <CheckCircle2 className="size-4" /> : <XCircle className="size-4" />}
          {result.found ? `Counted in "${result.electionTitle}"` : "Not found. Check the code and try again."}
        </div>
      ) : null}
    </form>
  );
}

export { VerifyForm };
