import Link from "next/link";
import { Button } from "@/components/ui/button";

export interface AppHeaderProps {
  /** Rendered on the right when the student/officer is signed in. */
  session?: { displayName: string; href: string } | null;
}

function AppHeader({ session = null }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface/90 backdrop-blur supports-[backdrop-filter]:bg-surface/70">
      <div className="mx-auto flex h-14 max-w-(--breakpoint-xl) items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className="font-heading text-lg font-semibold tracking-tight text-navy"
        >
          SDEC
        </Link>
        <nav className="flex items-center gap-2">
          {session ? (
            <Button
              variant="ghost"
              size="sm"
              nativeButton={false}
              render={<Link href={session.href}>{session.displayName}</Link>}
            />
          ) : (
            <Button
              size="sm"
              nativeButton={false}
              render={<Link href="/login">Sign in</Link>}
            />
          )}
        </nav>
      </div>
    </header>
  );
}

export { AppHeader };
