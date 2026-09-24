import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AdminShell } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { ScrollText } from "lucide-react";
import { signOut } from "@/actions/auth";
import { formatIst } from "@/lib/ist-time";

export const metadata: Metadata = {
  title: "Audit log",
};

const PAGE_SIZE = 30;

interface AuditRow {
  id: number;
  action: string;
  entity: string | null;
  entity_id: string | null;
  meta: Record<string, unknown>;
  created_at: string;
  profiles: { display_name: string | null } | null;
}

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") redirect("/admin");

  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam ?? "1") || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const supabase = await createClient();
  const { data, count } = await supabase
    .from("audit_log")
    .select("id, action, entity, entity_id, meta, created_at, profiles(display_name)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  const entries = (data ?? []) as unknown as AuditRow[];
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
          <h1 className="font-heading text-2xl font-semibold text-navy">Audit log</h1>
          <p className="text-sm text-caption">{total} entries</p>
        </div>

        {entries.length === 0 ? (
          <EmptyState
            icon={<ScrollText />}
            title="Nothing logged yet"
            description="Admin and officer actions (publishing elections, importing voters, reviewing nominations, and so on) show up here."
          />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border bg-surface">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Who</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="whitespace-nowrap text-xs text-caption">
                      {formatIst(entry.created_at)}
                    </TableCell>
                    <TableCell className="text-sm">{entry.profiles?.display_name ?? "—"}</TableCell>
                    <TableCell className="font-mono text-xs">{entry.action}</TableCell>
                    <TableCell className="max-w-xs truncate text-xs text-ink-2">
                      {Object.keys(entry.meta ?? {}).length > 0 ? JSON.stringify(entry.meta) : "—"}
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
                render={<a href={`?page=${page - 1}`} />}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                nativeButton={false}
                render={<a href={`?page=${page + 1}`} />}
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
