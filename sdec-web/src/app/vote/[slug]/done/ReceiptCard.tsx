"use client";

import * as React from "react";
import Link from "next/link";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { takeReceipt } from "@/lib/ballot-storage";
import { Confetti } from "./Confetti";

export interface ReceiptCardProps {
  slug: string;
  electionTitle: string;
}

function downloadReceiptImage(code: string, electionTitle: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 800;
  canvas.height = 450;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.fillStyle = "#F7F7F4";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.textAlign = "center";

  ctx.fillStyle = "#7A808C";
  ctx.font = "20px sans-serif";
  ctx.fillText("SDEC voting receipt", canvas.width / 2, 100);

  ctx.fillStyle = "#1F2A4D";
  ctx.font = "24px serif";
  ctx.fillText(electionTitle, canvas.width / 2, 150);

  ctx.fillStyle = "#0E8C7A";
  ctx.font = "bold 52px serif";
  ctx.fillText(code.split("").join(" "), canvas.width / 2, 260);

  ctx.fillStyle = "#7A808C";
  ctx.font = "16px sans-serif";
  ctx.fillText("Keep this code. It proves your ballot was counted —", canvas.width / 2, 330);
  ctx.fillText("without revealing your vote.", canvas.width / 2, 354);

  const link = document.createElement("a");
  link.download = `sdec-receipt-${code}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

function ReceiptCard({ slug, electionTitle }: ReceiptCardProps) {
  const [receipt, setReceipt] = React.useState<string | null | undefined>(undefined);

  React.useEffect(() => {
    function restore() {
      setReceipt(takeReceipt(slug));
    }
    restore();
  }, [slug]);

  if (receipt === undefined) return null;

  if (!receipt) {
    return (
      <div className="w-full space-y-4 text-center">
        <h1 className="font-heading text-xl font-semibold text-navy">You&apos;ve already voted</h1>
        <p className="text-sm text-ink-2">
          Your receipt for &quot;{electionTitle}&quot; was shown once, right after you voted.
        </p>
        <Button render={<Link href="/dashboard" />} nativeButton={false}>
          Back to dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="relative w-full space-y-6 text-center">
      <Confetti />
      <div className="flex justify-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-teal text-white">
          <Check className="size-7" strokeWidth={3} />
        </span>
      </div>
      <div>
        <h1 className="font-heading text-xl font-semibold text-navy">Your vote is counted</h1>
        <p className="mt-1 text-sm text-ink-2">in &quot;{electionTitle}&quot;</p>
      </div>

      <div className="rounded-2xl border border-border bg-surface p-6">
        <p className="text-xs font-medium text-caption">Receipt code</p>
        <p className="font-heading mt-2 text-3xl tracking-[0.2em] text-teal">{receipt}</p>
      </div>

      <div className="flex justify-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            navigator.clipboard.writeText(receipt);
            toast.success("Receipt copied");
          }}
        >
          <Copy data-icon="inline-start" />
          Copy
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => downloadReceiptImage(receipt, electionTitle)}>
          Save as image
        </Button>
      </div>

      <p className="text-xs text-caption">
        Votes are secret. No one, including the commission, can see who you voted for.
        <br />
        Verify anytime at <Link href="/verify" className="text-teal underline-offset-2 hover:underline">/verify</Link>.
      </p>

      <Button render={<Link href="/dashboard" />} nativeButton={false} className="w-full">
        Back to dashboard
      </Button>
    </div>
  );
}

export { ReceiptCard };
