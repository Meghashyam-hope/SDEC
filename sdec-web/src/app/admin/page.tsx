import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { AdminShell } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { signOut } from "@/actions/auth";

export const metadata: Metadata = {
  title: "Overview",
};

export default async function AdminOverviewPage() {
  const profile = await getCurrentProfile();
  if (!profile || profile.role === "student") redirect("/admin/login");

  return (
    <AdminShell
      actions={
        <form action={signOut}>
          <Button type="submit" variant="ghost" size="sm">
            {profile.display_name ?? "Sign out"}
          </Button>
        </form>
      }
    >
      <div>
        <h1 className="font-heading text-2xl font-semibold text-navy">Overview</h1>
        <p className="text-sm text-caption">
          Signed in as {profile.display_name ?? "—"} · {profile.role}
        </p>
      </div>

      <div className="mt-8 rounded-2xl border border-dashed border-border bg-surface-2/40 px-6 py-10 text-center">
        <p className="text-sm text-ink-2">
          Election cards, turnout and recent audit entries land here in Phase 3.
        </p>
      </div>
    </AdminShell>
  );
}
