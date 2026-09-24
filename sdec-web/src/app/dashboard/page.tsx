import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { signOut } from "@/actions/auth";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const voter = profile.voters;

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <AppHeader
        session={{ displayName: voter?.full_name ?? "My profile", href: "/dashboard" }}
      />
      <main className="mx-auto w-full max-w-(--breakpoint-md) flex-1 px-4 py-10 sm:px-6">
        <h1 className="font-heading text-2xl font-semibold text-navy">
          {voter ? `Hi, ${voter.full_name.split(" ")[0]}` : "Hi there"}
        </h1>
        <p className="mt-1 text-sm text-caption">
          {voter
            ? `${voter.roll_number} · ${voter.department}, Year ${voter.year}`
            : "You're signed in, but you're not on the voter roll — contact the election commission."}
        </p>

        <div className="mt-8 rounded-2xl border border-dashed border-border bg-surface-2/40 px-6 py-10 text-center">
          <p className="text-sm text-ink-2">
            Elections you&apos;re eligible for will show up here once Phase 4 builds this out.
          </p>
        </div>

        <form action={signOut} className="mt-8">
          <Button type="submit" variant="outline" size="sm">
            Sign out
          </Button>
        </form>
      </main>
    </div>
  );
}
