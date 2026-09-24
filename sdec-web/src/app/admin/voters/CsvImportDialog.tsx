"use client";

import * as React from "react";
import Papa from "papaparse";
import { toast } from "sonner";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Download } from "lucide-react";
import { CSV_COLUMNS, voterCsvRowSchema, type VoterCsvRow } from "@/lib/validators/voters";
import { importVotersCsv, type IssuedCredential } from "@/actions/voters";

function downloadCredentialsCsv(credentials: IssuedCredential[]) {
  const rows = ["Roll number,Email,Password", ...credentials.map((c) => `${c.roll_number},${c.email},${c.password}`)];
  const blob = new Blob([rows.join("\n")], { type: "text/csv" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "sdec-new-voter-logins.csv";
  link.click();
  URL.revokeObjectURL(link.href);
}

interface ParsedRow {
  row: number;
  raw: Record<string, string>;
  data: VoterCsvRow | null;
  error: string | null;
}

function parseRows(rawRows: Record<string, string>[]): ParsedRow[] {
  const seenRolls = new Set<string>();
  const seenEmails = new Set<string>();

  return rawRows.map((raw, index) => {
    const parsed = voterCsvRowSchema.safeParse(raw);
    if (!parsed.success) {
      return { row: index + 1, raw, data: null, error: parsed.error.issues[0]?.message ?? "Invalid row" };
    }
    if (seenRolls.has(parsed.data.roll_number)) {
      return { row: index + 1, raw, data: null, error: "Duplicate roll number in this file" };
    }
    if (seenEmails.has(parsed.data.email)) {
      return { row: index + 1, raw, data: null, error: "Duplicate email in this file" };
    }
    seenRolls.add(parsed.data.roll_number);
    seenEmails.add(parsed.data.email);
    return { row: index + 1, raw, data: parsed.data, error: null };
  });
}

function CsvImportDialog() {
  const [open, setOpen] = React.useState(false);
  const [rows, setRows] = React.useState<ParsedRow[] | null>(null);
  const [importing, setImporting] = React.useState(false);
  const [issuedCredentials, setIssuedCredentials] = React.useState<IssuedCredential[] | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const validCount = rows?.filter((r) => r.data).length ?? 0;
  const errorCount = rows?.filter((r) => r.error).length ?? 0;

  function handleFile(file: File) {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim().toLowerCase(),
      complete: (results) => {
        setRows(parseRows(results.data));
      },
      error: (err) => {
        toast.error(`Couldn't read that file: ${err.message}`);
      },
    });
  }

  async function handleConfirm() {
    if (!rows) return;
    const validRows = rows.filter((r): r is ParsedRow & { data: VoterCsvRow } => !!r.data);
    if (validRows.length === 0) return;

    setImporting(true);
    const result = await importVotersCsv(validRows.map((r) => r.data));
    setImporting(false);

    if (!result.ok) {
      toast.error("You need to be an admin to import voters.");
      return;
    }

    if (result.failed.length === 0) {
      toast.success(`Imported ${result.imported} voter${result.imported === 1 ? "" : "s"}`);
      setRows(null);
      setIssuedCredentials(result.credentials);
    } else {
      toast.warning(
        `Imported ${result.imported}, ${result.failed.length} failed — see details below.`,
      );
      setRows((prev) =>
        (prev ?? []).map((r) => {
          const failure = result.failed.find((f) => f.row === r.row);
          return failure ? { ...r, error: failure.error, data: null } : r;
        }),
      );
      if (result.credentials.length > 0) setIssuedCredentials(result.credentials);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setRows(null);
          setIssuedCredentials(null);
        }
      }}
    >
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <Upload data-icon="inline-start" />
        Import CSV
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import voter roll</DialogTitle>
          <DialogDescription>
            Columns: {CSV_COLUMNS.join(", ")}. Existing roll numbers are updated in place.
          </DialogDescription>
        </DialogHeader>

        {issuedCredentials ? (
          <div className="space-y-3">
            {issuedCredentials.length === 0 ? (
              <p className="text-sm text-ink-2">
                No new logins to issue — every imported voter already had one.
              </p>
            ) : (
              <>
                <p className="text-sm text-ink-2">
                  {issuedCredentials.length} new voter{issuedCredentials.length === 1 ? "" : "s"} got a login.
                  These passwords are shown <span className="font-medium text-ink">once</span> — download
                  them now to distribute out-of-band (there&apos;s no email/SMS in this build).
                </p>
                <Button size="sm" variant="outline" onClick={() => downloadCredentialsCsv(issuedCredentials)}>
                  <Download data-icon="inline-start" />
                  Download logins CSV
                </Button>
                <div className="max-h-64 overflow-y-auto rounded-lg border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Roll number</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Password</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {issuedCredentials.map((c) => (
                        <TableRow key={c.roll_number}>
                          <TableCell>{c.roll_number}</TableCell>
                          <TableCell className="text-ink-2">{c.email}</TableCell>
                          <TableCell className="font-mono">{c.password}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </div>
        ) : !rows ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-surface-2/40 px-6 py-10 text-center">
            <p className="text-sm text-ink-2">Choose a CSV file to preview it before importing.</p>
            <Button size="sm" onClick={() => fileInputRef.current?.click()}>
              Choose file
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
                e.target.value = "";
              }}
            />
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex gap-2 text-xs">
              <Badge variant="secondary">{rows.length} rows</Badge>
              <Badge className="bg-teal-tint text-teal">{validCount} valid</Badge>
              {errorCount > 0 ? (
                <Badge variant="destructive">{errorCount} error{errorCount === 1 ? "" : "s"}</Badge>
              ) : null}
            </div>
            <div className="max-h-80 overflow-y-auto rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">#</TableHead>
                    <TableHead>Roll number</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Dept / Year</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.row} className={r.error ? "bg-red-tint/40" : undefined}>
                      <TableCell className="text-caption">{r.row}</TableCell>
                      <TableCell>{r.data?.roll_number ?? r.raw.roll_number ?? "—"}</TableCell>
                      <TableCell>{r.data?.full_name ?? r.raw.full_name ?? "—"}</TableCell>
                      <TableCell>{r.data?.email ?? r.raw.email ?? "—"}</TableCell>
                      <TableCell>
                        {r.data ? `${r.data.department} · Y${r.data.year}` : "—"}
                      </TableCell>
                      <TableCell>
                        {r.error ? (
                          <span className="text-xs text-destructive">{r.error}</span>
                        ) : (
                          <span className="text-xs text-teal">OK</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setRows(null)}>
              Choose a different file
            </Button>
          </div>
        )}

        <DialogFooter>
          {issuedCredentials ? (
            <DialogClose render={<Button>Done</Button>} />
          ) : (
            <>
              <DialogClose render={<Button variant="outline">Cancel</Button>} />
              <Button onClick={handleConfirm} disabled={!rows || validCount === 0 || importing}>
                {importing ? "Importing…" : `Import ${validCount || ""} voter${validCount === 1 ? "" : "s"}`}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export { CsvImportDialog };
