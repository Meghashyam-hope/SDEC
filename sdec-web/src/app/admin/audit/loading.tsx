import { AdminShell } from "@/components/admin/AdminShell";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminAuditLoading() {
  return (
    <AdminShell>
      <div className="space-y-6">
        <div>
          <Skeleton className="h-7 w-32" />
          <Skeleton className="mt-1 h-4 w-20" />
        </div>
        <div className="overflow-hidden rounded-2xl border border-border">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded-none border-b border-border last:border-0" />
          ))}
        </div>
      </div>
    </AdminShell>
  );
}
