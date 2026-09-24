import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AdminShell } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { signOut } from "@/actions/auth";
import { TeamManager, type TeamVoter, type CommissionMember } from "./TeamManager";

export const metadata: Metadata = {
  title: "Team",
};

export default async function AdminTeamPage() {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") redirect("/admin");

  const supabase = await createClient();

  const [{ data: commissionRows }, { data: voterRows }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, role, display_name, voters(roll_number)")
      .in("role", ["officer", "admin"])
      .order("display_name"),
    supabase
      .from("voters")
      .select("id, roll_number, full_name, email, department, user_id, pending_role, profiles(role)")
      .eq("is_active", true)
      .order("full_name"),
  ]);

  const commission: CommissionMember[] = (commissionRows ?? []).map((p) => ({
    profileId: p.id,
    displayName: p.display_name ?? "—",
    rollNumber: p.voters?.roll_number ?? null,
    role: p.role,
  }));

  const voters: TeamVoter[] = (voterRows ?? []).map((v) => ({
    id: v.id,
    roll_number: v.roll_number,
    full_name: v.full_name,
    email: v.email,
    department: v.department,
    hasSignedIn: !!v.user_id,
    effectiveRole: v.profiles?.role ?? v.pending_role ?? "student",
  }));

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
        <div>
          <h1 className="font-heading text-2xl font-semibold text-navy">Team</h1>
          <p className="text-sm text-caption">Officers and admins. Admin only.</p>
        </div>
        <TeamManager commission={commission} voters={voters} />
      </div>
    </AdminShell>
  );
}
