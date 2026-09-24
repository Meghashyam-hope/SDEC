"use client";

import * as React from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { ShieldCheck } from "lucide-react";
import { setVoterRole, setProfileRole } from "@/actions/team";
import type { Database } from "@/lib/database.types";

type AppRole = Database["public"]["Enums"]["app_role"];

export interface CommissionMember {
  profileId: string;
  displayName: string;
  rollNumber: string | null;
  role: AppRole;
}

export interface TeamVoter {
  id: string;
  roll_number: string;
  full_name: string;
  email: string;
  department: string;
  effectiveRole: AppRole;
  hasSignedIn: boolean;
}

function RoleBadge({ role }: { role: AppRole }) {
  if (role === "admin") return <Badge className="bg-navy text-white">Admin</Badge>;
  if (role === "officer") return <Badge className="bg-teal-tint text-teal">Officer</Badge>;
  return <Badge variant="secondary">Student</Badge>;
}

function TeamManager({
  commission: initialCommission,
  voters,
}: {
  commission: CommissionMember[];
  voters: TeamVoter[];
}) {
  const [commission, setCommission] = React.useState(initialCommission);
  const [query, setQuery] = React.useState("");
  const [pendingId, setPendingId] = React.useState<string | null>(null);

  const promotedVoterIds = new Set(
    voters.filter((v) => v.effectiveRole !== "student").map((v) => v.id),
  );

  const matches =
    query.trim().length > 0
      ? voters
          .filter((v) => v.effectiveRole === "student")
          .filter(
            (v) =>
              v.full_name.toLowerCase().includes(query.toLowerCase()) ||
              v.roll_number.toLowerCase().includes(query.toLowerCase()) ||
              v.email.toLowerCase().includes(query.toLowerCase()),
          )
          .slice(0, 8)
      : [];

  async function removeFromCommission(member: CommissionMember) {
    setPendingId(member.profileId);
    const result = await setProfileRole(member.profileId, "student");
    setPendingId(null);

    if (!result.ok) {
      toast.error("Couldn't update that role.");
      return;
    }

    setCommission((prev) => prev.filter((m) => m.profileId !== member.profileId));
    toast.success(`${member.displayName} removed from the commission`);
  }

  async function promoteVoter(voter: TeamVoter, role: AppRole) {
    setPendingId(voter.id);
    const result = await setVoterRole(voter.id, role);
    setPendingId(null);

    if (!result.ok) {
      toast.error("Couldn't update that role.");
      return;
    }

    setQuery("");
    setCommission((prev) => [
      ...prev,
      { profileId: voter.id, displayName: voter.full_name, rollNumber: voter.roll_number, role },
    ]);

    if (result.generatedPassword) {
      toast.success(`${voter.full_name} is now an ${role} — password: ${result.generatedPassword}`, {
        duration: 30000,
      });
    } else {
      toast.success(`${voter.full_name} is now an ${role}`);
    }
  }

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h2 className="text-sm font-medium text-ink-2">Election commission</h2>
        {commission.length === 0 ? (
          <EmptyState
            icon={<ShieldCheck />}
            title="Just you, for now"
            description="Search for a voter below to add them as an officer or admin."
          />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border bg-surface">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Roll number</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {commission.map((m) => (
                  <TableRow key={m.profileId}>
                    <TableCell>{m.displayName}</TableCell>
                    <TableCell className="text-ink-2">{m.rollNumber ?? "—"}</TableCell>
                    <TableCell>
                      <RoleBadge role={m.role} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={pendingId === m.profileId}
                        onClick={() => removeFromCommission(m)}
                      >
                        Remove
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-ink-2">Add to the commission</h2>
        <p className="text-xs text-caption">
          Only current voters can be promoted. If they don&apos;t have a login yet, one is
          created for them — the password shows once, so copy it before it disappears.
        </p>
        <Input
          placeholder="Search by name, roll number or email…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="max-w-sm"
        />
        {matches.length > 0 ? (
          <div className="overflow-hidden rounded-2xl border border-border bg-surface">
            <Table>
              <TableBody>
                {matches.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell>{v.full_name}</TableCell>
                    <TableCell className="text-ink-2">{v.roll_number}</TableCell>
                    <TableCell className="text-ink-2">{v.department}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={pendingId === v.id || promotedVoterIds.has(v.id)}
                          onClick={() => promoteVoter(v, "officer")}
                        >
                          Make officer
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={pendingId === v.id || promotedVoterIds.has(v.id)}
                          onClick={() => promoteVoter(v, "admin")}
                        >
                          Make admin
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : query.trim().length > 0 ? (
          <p className="text-sm text-caption">No matching voters.</p>
        ) : null}
      </section>
    </div>
  );
}

export { TeamManager };
