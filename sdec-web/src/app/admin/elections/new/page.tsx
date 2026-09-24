import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { getVoterFacets } from "@/actions/elections";
import { AdminShell } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { ElectionForm } from "@/components/admin/ElectionForm";
import { signOut } from "@/actions/auth";

export const metadata: Metadata = {
  title: "New election",
};

export default async function NewElectionPage() {
  const profile = await getCurrentProfile();
  if (!profile || profile.role === "student") redirect("/admin/login");

  const { departments, sections } = await getVoterFacets();

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
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-navy">New election</h1>
          <p className="text-sm text-caption">
            It starts as a draft — nothing is visible to students until you publish it.
          </p>
        </div>

        <ElectionForm departments={departments} sections={sections} />
      </div>
    </AdminShell>
  );
}
