import { notFound } from "next/navigation";
import Link from "next/link";
import { AdminShell } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { PhaseBadge } from "@/components/election/PhaseBadge";

export default function DevUiAdminShellPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return (
    <AdminShell
      actions={
        <Button
          size="sm"
          variant="ghost"
          nativeButton={false}
          render={<Link href="/dev/ui">← Back to /dev/ui</Link>}
        />
      }
    >
      <div className="space-y-6">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-navy">Overview</h1>
          <p className="text-sm text-caption">Preview of the admin shell — sidebar on desktop, drawer on mobile.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Student Council 2026</CardTitle>
              <CardDescription className="flex items-center gap-2">
                <PhaseBadge phase="live" /> 1,204 eligible
              </CardDescription>
            </CardHeader>
            <CardContent className="text-2xl font-semibold tabular-nums text-ink">742 voted</CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>CSE Class Rep</CardTitle>
              <CardDescription className="flex items-center gap-2">
                <PhaseBadge phase="scheduled" />
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-ink-2">Opens in 3 days</CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Hostel Council 2025</CardTitle>
              <CardDescription className="flex items-center gap-2">
                <PhaseBadge phase="results" />
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-ink-2">Results published</CardContent>
          </Card>
        </div>
      </div>
    </AdminShell>
  );
}
