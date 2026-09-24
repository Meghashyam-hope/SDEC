"use client";

import * as React from "react";
import { toast } from "sonner";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PositionResults } from "@/components/election/PositionResults";
import { TurnoutRing } from "@/components/election/TurnoutRing";
import { publishResults, type ElectionResults, type ElectionTurnout } from "@/actions/results";

export interface ResultsPanelProps {
  electionId: string;
  slug: string;
  results: ElectionResults;
  turnout: ElectionTurnout;
  canPublish: boolean;
}

function downloadResultsCsv(results: ElectionResults) {
  const rows: string[] = ["Position,Candidate,Votes,Percentage,Elected"];

  for (const position of results.positions) {
    const total = position.candidates.reduce((sum, c) => sum + c.votes, 0) + position.nota_votes;
    position.candidates.forEach((c, index) => {
      const pct = total > 0 ? ((c.votes / total) * 100).toFixed(1) : "0.0";
      rows.push(`"${position.title}","${c.display_name}",${c.votes},${pct}%,${index < position.seats ? "Yes" : "No"}`);
    });
    if (position.nota_votes > 0) {
      const pct = total > 0 ? ((position.nota_votes / total) * 100).toFixed(1) : "0.0";
      rows.push(`"${position.title}","None of the above",${position.nota_votes},${pct}%,No`);
    }
  }

  const blob = new Blob([rows.join("\n")], { type: "text/csv" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "results.csv";
  link.click();
  URL.revokeObjectURL(link.href);
}

function ResultsPanel({ electionId, slug, results, turnout, canPublish }: ResultsPanelProps) {
  const [publishing, setPublishing] = React.useState(false);
  const [published, setPublished] = React.useState(!!results.results_published_at);

  async function handlePublish() {
    setPublishing(true);
    const result = await publishResults(electionId, slug);
    setPublishing(false);

    if (!result.ok) {
      toast.error(result.error ?? "Could not publish results");
      return;
    }
    setPublished(true);
    toast.success("Results published — visible to everyone now.");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <TurnoutRing votesCast={turnout.votes_cast} eligibleVoters={turnout.eligible_voters} />
          <p className="text-sm text-ink-2">{published ? "Results are published" : "Results aren't published yet"}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => downloadResultsCsv(results)}>
            <Download data-icon="inline-start" />
            Export CSV
          </Button>
          {canPublish && !published ? (
            <Button size="sm" onClick={handlePublish} disabled={publishing}>
              {publishing ? "Publishing…" : "Publish results"}
            </Button>
          ) : null}
        </div>
      </div>

      <div className="space-y-8">
        {results.positions.map((p) => (
          <PositionResults key={p.position_id} position={p} />
        ))}
      </div>
    </div>
  );
}

export { ResultsPanel };
