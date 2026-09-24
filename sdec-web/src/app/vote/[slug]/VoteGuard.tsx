import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";

export interface VoteGuardProps {
  displayName?: string;
  title: string;
  message: string;
}

/** The calm "you can't vote right now" screen — not eligible, already
 * voted, not live, paused, etc (SDEC_PLAN §10 Phase 4 guard states). */
function VoteGuard({ displayName, title, message }: VoteGuardProps) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <AppHeader session={displayName ? { displayName, href: "/dashboard" } : null} />
      <main className="mx-auto flex w-full max-w-(--breakpoint-sm) flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
        <h1 className="font-heading text-xl font-semibold text-navy">{title}</h1>
        <p className="text-sm text-ink-2">{message}</p>
        <Button render={<Link href="/dashboard" />} nativeButton={false}>
          Back to dashboard
        </Button>
      </main>
    </div>
  );
}

export { VoteGuard };
