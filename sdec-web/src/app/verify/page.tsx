import type { Metadata } from "next";
import { AppHeader } from "@/components/AppHeader";
import { VerifyForm } from "./VerifyForm";

export const metadata: Metadata = {
  title: "Verify a receipt",
};

export default function VerifyPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <AppHeader />
      <main className="mx-auto flex w-full max-w-(--breakpoint-sm) flex-1 flex-col items-center justify-center px-4 py-16 text-center">
        <h1 className="font-heading text-2xl font-semibold text-navy">Verify your receipt</h1>
        <p className="mt-2 max-w-sm text-sm text-ink-2">
          Enter the 12-character code from your receipt to confirm your ballot was counted — without
          revealing who you voted for.
        </p>
        <div className="mt-8 w-full max-w-xs">
          <VerifyForm />
        </div>
      </main>
    </div>
  );
}
