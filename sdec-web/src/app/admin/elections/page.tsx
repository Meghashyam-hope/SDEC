import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AdminShell } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { PhaseBadge } from "@/components/election/PhaseBadge";
import { EmptyState } from "@/components/ui/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Vote, Plus } from "lucide-react";
import { signOut } from "@/actions/auth";
import { electionPhase } from "@/lib/election-phase";
import { formatIst } from "@/lib/ist-time";
import type { Database } from "@/lib/database.types";

export const metadata: Metadata = {
  title: "Elections",
};

type ElectionRow = Database["public"]["Tables"]["elections"]["Row"] & {
  election_turnout: { votes_cast: number } | null;
};

export default async function AdminElectionsPage() {
  const profile = await getCurrentProfile();
  if (!profile || profile.role === "student") redirect("/admin/login");

  const supabase = await createClient();
  const { data } = await supabase
    .from("elections")
    .select("*, election_turnout(votes_cast)")
    .order("starts_at", { ascending: false });

  const elections = (data ?? []) as unknown as ElectionRow[];

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
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading text-2xl font-semibold text-navy">Elections</h1>
            <p className="text-sm text-caption">{elections.length} total</p>
          </div>
          <Button size="sm" render={<Link href="/admin/elections/new" />} nativeButton={false}>
            <Plus data-icon="inline-start" />
            New election
          </Button>
        </div>

        {elections.length === 0 ? (
          <EmptyState
            icon={<Vote />}
            title="No elections yet"
            description="Create your first election to get started."
          />
        ) : (
          <div className="space-y-3">
            {elections.map((election) => {
              const phase = electionPhase(election);
              return (
                <Link key={election.id} href={`/admin/elections/${election.id}`}>
                  <Card className="transition-colors hover:bg-surface-2/60">
                    <CardContent className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-heading text-base font-medium text-ink">{election.title}</p>
                          <PhaseBadge phase={phase} />
                        </div>
                        <p className="mt-1 text-sm text-caption">
                          {formatIst(election.starts_at)} → {formatIst(election.ends_at)}
                        </p>
                      </div>
                      <p className="text-sm text-ink-2">
                        {election.election_turnout?.votes_cast ?? 0} vote
                        {election.election_turnout?.votes_cast === 1 ? "" : "s"} cast
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </AdminShell>
  );
}
