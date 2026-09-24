"use client";

import * as React from "react";
import Image from "next/image";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
import { createCandidate, updateCandidate, searchVotersForCandidate, type VoterSearchResult } from "@/actions/candidates";
import { createClient } from "@/lib/supabase/client";
import { toSquareWebp } from "@/lib/image";
import { candidatePhotoUrl } from "@/lib/storage";

export interface CandidateFormValues {
  id?: string;
  display_name: string;
  tagline: string;
  manifesto: string;
  voter_id: string | null;
  photo_path: string | null;
}

export interface CandidateFormDialogProps {
  positionId: string;
  triggerRender: React.ReactElement;
  triggerLabel: React.ReactNode;
  initial?: CandidateFormValues;
}

function CandidateFormDialog({ positionId, triggerRender, triggerLabel, initial }: CandidateFormDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [displayName, setDisplayName] = React.useState(initial?.display_name ?? "");
  const [tagline, setTagline] = React.useState(initial?.tagline ?? "");
  const [manifesto, setManifesto] = React.useState(initial?.manifesto ?? "");
  const [voterId, setVoterId] = React.useState<string | null>(initial?.voter_id ?? null);
  const [voterLabel, setVoterLabel] = React.useState<string | null>(null);
  const [photoPath, setPhotoPath] = React.useState<string | null>(initial?.photo_path ?? null);
  const [voterQuery, setVoterQuery] = React.useState("");
  const [voterResults, setVoterResults] = React.useState<VoterSearchResult[]>([]);
  const [uploading, setUploading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    function schedule() {
      if (voterQuery.trim().length < 2) {
        setVoterResults([]);
        return null;
      }
      return setTimeout(() => {
        searchVotersForCandidate(voterQuery).then(setVoterResults);
      }, 250);
    }
    const timeout = schedule();
    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [voterQuery]);

  function reset() {
    setDisplayName(initial?.display_name ?? "");
    setTagline(initial?.tagline ?? "");
    setManifesto(initial?.manifesto ?? "");
    setVoterId(initial?.voter_id ?? null);
    setVoterLabel(null);
    setPhotoPath(initial?.photo_path ?? null);
    setVoterQuery("");
    setVoterResults([]);
    setError(null);
  }

  function selectVoter(voter: VoterSearchResult) {
    setVoterId(voter.id);
    setVoterLabel(`${voter.full_name} · ${voter.roll_number}`);
    if (!displayName) setDisplayName(voter.full_name);
    setVoterQuery("");
    setVoterResults([]);
  }

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setUploading(true);
    try {
      const blob = await toSquareWebp(file);
      const supabase = createClient();
      const path = `candidates/${positionId}/${crypto.randomUUID()}.webp`;
      const { error: uploadError } = await supabase.storage
        .from("candidate-photos")
        .upload(path, blob, { contentType: "image/webp" });
      if (uploadError) throw uploadError;
      setPhotoPath(path);
    } catch {
      toast.error("Couldn't upload that photo. Try a different image.");
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit() {
    setSaving(true);
    setError(null);

    const input = { display_name: displayName, tagline, manifesto, voter_id: voterId, photo_path: photoPath };
    const result = initial?.id
      ? await updateCandidate(initial.id, positionId, input)
      : await createCandidate(positionId, input);

    setSaving(false);
    if (!result.ok) {
      setError(result.error ?? "Something went wrong");
      return;
    }

    toast.success(initial?.id ? "Candidate updated" : "Candidate added");
    setOpen(false);
    if (!initial?.id) reset();
  }

  const photoUrl = candidatePhotoUrl(photoPath);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger render={triggerRender}>{triggerLabel}</DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{initial?.id ? "Edit candidate" : "Add candidate"}</DialogTitle>
          <DialogDescription>Candidates are approved automatically when added here.</DialogDescription>
        </DialogHeader>

        <div className="max-h-[65vh] space-y-4 overflow-y-auto pr-1">
          <div className="flex items-center gap-3">
            <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-surface-2">
              {photoUrl ? (
                <Image src={photoUrl} alt="" width={64} height={64} className="size-16 object-cover" unoptimized />
              ) : (
                <span className="text-xs text-caption">No photo</span>
              )}
            </div>
            <div>
              <Label htmlFor="candidate-photo" className="cursor-pointer text-teal">
                {uploading ? "Uploading…" : "Upload photo"}
              </Label>
              <input
                id="candidate-photo"
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploading}
                onChange={handlePhotoChange}
              />
              <p className="text-xs text-caption">Square, resized automatically</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Link to a voter (optional)</Label>
            {voterId && voterLabel ? (
              <div className="flex items-center justify-between rounded-lg border border-border px-2.5 py-1.5 text-sm">
                {voterLabel}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setVoterId(null);
                    setVoterLabel(null);
                  }}
                >
                  Clear
                </Button>
              </div>
            ) : (
              <div className="relative">
                <Input
                  placeholder="Search by roll number or name…"
                  value={voterQuery}
                  onChange={(e) => setVoterQuery(e.target.value)}
                />
                {voterResults.length > 0 ? (
                  <div className="absolute z-10 mt-1 w-full rounded-lg border border-border bg-surface shadow-md">
                    {voterResults.map((v) => (
                      <button
                        key={v.id}
                        type="button"
                        className="flex w-full flex-col items-start px-2.5 py-1.5 text-left text-sm hover:bg-surface-2"
                        onClick={() => selectVoter(v)}
                      >
                        <span>{v.full_name}</span>
                        <span className="text-xs text-caption">
                          {v.roll_number} · {v.department} Y{v.year}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="candidate-name">Display name</Label>
            <Input id="candidate-name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="candidate-tagline">Tagline</Label>
            <Input
              id="candidate-tagline"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="One line, shown on the ballot card"
              maxLength={140}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Manifesto</Label>
            <Tabs defaultValue="write">
              <TabsList>
                <TabsTrigger value="write">Write</TabsTrigger>
                <TabsTrigger value="preview">Preview</TabsTrigger>
              </TabsList>
              <TabsContent value="write">
                <Textarea
                  value={manifesto}
                  onChange={(e) => setManifesto(e.target.value)}
                  rows={6}
                  placeholder="Markdown supported"
                />
              </TabsContent>
              <TabsContent value="preview">
                <div className="prose prose-sm min-h-32 max-w-none rounded-lg border border-border px-3 py-2 text-ink-2">
                  {manifesto ? <ReactMarkdown>{manifesto}</ReactMarkdown> : <p className="text-caption">Nothing to preview yet.</p>}
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>

        <DialogFooter>
          <DialogClose render={<Button variant="outline">Cancel</Button>} />
          <Button onClick={handleSubmit} disabled={saving || !displayName.trim() || uploading}>
            {saving ? "Saving…" : initial?.id ? "Save changes" : "Add candidate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export { CandidateFormDialog };
