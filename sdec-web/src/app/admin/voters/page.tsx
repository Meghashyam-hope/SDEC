import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AdminShell } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { Users } from "lucide-react";
import { signOut } from "@/actions/auth";
import { VotersFilterBar } from "./VotersFilterBar";
import { VoterRowActions } from "./VoterRowActions";

export const metadata: Metadata = {
  title: "Voters",
};

const PAGE_SIZE = 20;

function pageHref(params: Record<string, string | undefined>, page: number): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value && key !== "page") search.set(key, value);
  }
  search.set("page", String(page));
  return search.toString();
}

export default async function AdminVotersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role === "student") redirect("/admin/login");

  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? "1") || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const supabase = await createClient();

  let query = supabase
    .from("voters")
    .select("id, roll_number, full_name, email, department, year, section, is_active", {
      count: "exact",
    })
    .order("roll_number");

  if (params.q) {
    const q = params.q.replace(/[%_]/g, "");
    query = query.or(
      `full_name.ilike.%${q}%,roll_number.ilike.%${q}%,email.ilike.%${q}%`,
    );
  }
  if (params.dept) query = query.eq("department", params.dept);
  if (params.year) query = query.eq("year", Number(params.year));
  if (params.active === "active") query = query.eq("is_active", true);
  if (params.active === "inactive") query = query.eq("is_active", false);

  const { data: voters, count } = await query.range(from, to);

  const { data: deptRows } = await supabase
    .from("voters")
    .select("department")
    .order("department");
  const departments = [...new Set((deptRows ?? []).map((d) => d.department))];

  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

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
          <h1 className="font-heading text-2xl font-semibold text-navy">Voters</h1>
          <p className="text-sm text-caption">{total} on the roll</p>
        </div>

        <VotersFilterBar departments={departments} />

        {!voters || voters.length === 0 ? (
          <EmptyState
            icon={<Users />}
            title="No voters match"
            description="Try a different search or filter, or import a CSV to add voters to the roll."
          />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border bg-surface">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Roll number</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Dept</TableHead>
                  <TableHead>Year</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {voters.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell className="font-medium">{v.roll_number}</TableCell>
                    <TableCell>{v.full_name}</TableCell>
                    <TableCell className="text-ink-2">{v.email}</TableCell>
                    <TableCell>{v.department}</TableCell>
                    <TableCell>
                      {v.year}
                      {v.section ? `-${v.section}` : ""}
                    </TableCell>
                    <TableCell>
                      {v.is_active ? (
                        <Badge className="bg-teal-tint text-teal">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <VoterRowActions voterId={v.id} isActive={v.is_active} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {totalPages > 1 ? (
          <div className="flex items-center justify-between text-sm text-ink-2">
            <span>
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                nativeButton={false}
                render={<a href={`?${pageHref(params, page - 1)}`} />}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                nativeButton={false}
                render={<a href={`?${pageHref(params, page + 1)}`} />}
              >
                Next
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </AdminShell>
  );
}
