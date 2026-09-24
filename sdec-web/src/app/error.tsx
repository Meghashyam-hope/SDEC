"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

/** Next 16 renamed this file convention's callback prop from `reset` to
 * `retry` — see node_modules/next/dist/docs/.../error.md. */
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background px-4 text-center">
      <h1 className="font-heading text-xl font-semibold text-navy">Something went wrong</h1>
      <p className="max-w-sm text-sm text-ink-2">
        That&apos;s on us, not you. Try again, or head back to the dashboard.
      </p>
      <div className="flex gap-2">
        <Button onClick={() => retry()}>Try again</Button>
        <Button variant="outline" render={<Link href="/" />} nativeButton={false}>
          Go home
        </Button>
      </div>
    </div>
  );
}
