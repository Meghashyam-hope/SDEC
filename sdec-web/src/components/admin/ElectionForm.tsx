"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EligibilityEditor } from "@/components/election/EligibilityEditor";
import { createElection, updateElectionDetails } from "@/actions/elections";
import {
  RESULTS_VISIBILITY,
  RESULTS_VISIBILITY_LABEL,
  type ElectionFormValues,
  type ResultsVisibility,
} from "@/lib/validators/elections";
import { utcIsoToIstInput } from "@/lib/ist-time";
import type { Eligibility } from "@/lib/eligibility";

const RESULTS_VISIBILITY_ITEMS: Record<ResultsVisibility, string> = RESULTS_VISIBILITY.reduce(
  (acc, key) => ({ ...acc, [key]: RESULTS_VISIBILITY_LABEL[key] }),
  {} as Record<ResultsVisibility, string>,
);

export interface ElectionFormElection {
  id: string;
  title: string;
  description: string | null;
  starts_at: string;
  ends_at: string;
  nominations_open_at: string | null;
  nominations_close_at: string | null;
  results_visibility: ResultsVisibility;
  allow_nota: boolean;
  eligibility: Eligibility;
}

export interface ElectionFormProps {
  election?: ElectionFormElection;
  departments: string[];
  sections: string[];
  /** True once the election is live or later — structural fields lock,
   * only the description stays editable (SDEC_PLAN §10 Phase 3). */
  locked?: boolean;
}

function blank(): ElectionFormValues {
  return {
    title: "",
    description: "",
    starts_at: "",
    ends_at: "",
    nominations_open_at: "",
    nominations_close_at: "",
    results_visibility: "after_close",
    allow_nota: false,
    eligibility: {},
  };
}

function fromElection(election: ElectionFormElection): ElectionFormValues {
  return {
    title: election.title,
    description: election.description ?? "",
    starts_at: utcIsoToIstInput(election.starts_at),
    ends_at: utcIsoToIstInput(election.ends_at),
    nominations_open_at: election.nominations_open_at ? utcIsoToIstInput(election.nominations_open_at) : "",
    nominations_close_at: election.nominations_close_at
      ? utcIsoToIstInput(election.nominations_close_at)
      : "",
    results_visibility: election.results_visibility,
    allow_nota: election.allow_nota,
    eligibility: election.eligibility,
  };
}

function ElectionForm({ election, departments, sections, locked = false }: ElectionFormProps) {
  const router = useRouter();
  const [values, setValues] = React.useState<ElectionFormValues>(() =>
    election ? fromElection(election) : blank(),
  );
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  function set<K extends keyof ElectionFormValues>(key: K, value: ElectionFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const result = election
      ? await updateElectionDetails(election.id, values)
      : await createElection(values);

    setSaving(false);

    if (!result.ok) {
      setError(result.error ?? "Something went wrong");
      return;
    }

    toast.success(election ? "Election details saved" : "Draft election created");
    if (!election) return; // createElection redirects itself
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {locked ? (
        <p className="rounded-xl border border-amber-tint bg-amber-tint px-3 py-2 text-sm text-amber">
          This election is live or has ended — only the description can still change.
        </p>
      ) : null}

      <div className="space-y-1.5">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          value={values.title}
          disabled={locked}
          onChange={(e) => set("title", e.target.value)}
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={values.description}
          onChange={(e) => set("description", e.target.value)}
          rows={3}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="starts_at">Voting starts (IST)</Label>
          <Input
            id="starts_at"
            type="datetime-local"
            value={values.starts_at}
            disabled={locked}
            onChange={(e) => set("starts_at", e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ends_at">Voting ends (IST)</Label>
          <Input
            id="ends_at"
            type="datetime-local"
            value={values.ends_at}
            disabled={locked}
            onChange={(e) => set("ends_at", e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="nominations_open_at">Nominations open (optional, IST)</Label>
          <Input
            id="nominations_open_at"
            type="datetime-local"
            value={values.nominations_open_at}
            disabled={locked}
            onChange={(e) => set("nominations_open_at", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="nominations_close_at">Nominations close (optional, IST)</Label>
          <Input
            id="nominations_close_at"
            type="datetime-local"
            value={values.nominations_close_at}
            disabled={locked}
            onChange={(e) => set("nominations_close_at", e.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Results visibility</Label>
          <Select
            items={RESULTS_VISIBILITY_ITEMS}
            value={values.results_visibility}
            disabled={locked}
            onValueChange={(v) => set("results_visibility", v as ResultsVisibility)}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RESULTS_VISIBILITY.map((key) => (
                <SelectItem key={key} value={key}>
                  {RESULTS_VISIBILITY_LABEL[key]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end pb-1.5">
          <label className="flex items-center gap-2 text-sm text-ink-2">
            <Checkbox
              checked={values.allow_nota}
              disabled={locked}
              onCheckedChange={(checked) => set("allow_nota", checked === true)}
            />
            Allow &quot;None of the above&quot; on the ballot
          </label>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Who&apos;s eligible</Label>
        <EligibilityEditor
          value={values.eligibility}
          onChange={(eligibility) => set("eligibility", eligibility)}
          departments={departments}
          sections={sections}
          disabled={locked}
        />
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Button type="submit" disabled={saving}>
        {saving ? "Saving…" : election ? "Save changes" : "Create draft election"}
      </Button>
    </form>
  );
}

export { ElectionForm };
