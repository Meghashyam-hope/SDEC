"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { submitNomination } from "@/actions/nominations";
import { createClient } from "@/lib/supabase/client";
import { toSquareWebp } from "@/lib/image";
import { candidatePhotoUrl } from "@/lib/storage";

export interface OpenPosition {
  id: string;
  title: string;
}

export interface MyApplication {
  positionId: string;
  positionTitle: string;
  status: string;
  rejectionReason: string | null;
}

export interface NominationFormProps {
  voterId: string;
  positions: OpenPosition[];
  myApplications: MyApplication[];
}

function StatusBadge({ status }: { status: string }) {
  if (status === "approved") return <Badge className="bg-teal-tint text-teal">Approved</Badge>;
  if (status === "rejected") return <Badge variant="destructive">Rejected</Badge>;
  return <Badge variant="secondary">Pending review</Badge>;
}

function NominationForm({ voterId, positions, myApplications }: NominationFormProps) {
  const router = useRouter();
  const [positionId, setPositionId] = React.useState("");
  const [tagline, setTagline] = React.useState("");
  const [manifesto, setManifesto] = React.useState("");
  const [photoPath, setPhotoPath] = React.useState<string | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const positionItems: Record<string, string> = Object.fromEntries(positions.map((p) => [p.id, p.title]));

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setUploading(true);
    try {
      const blob = await toSquareWebp(file);
      const supabase = createClient();
      const path = `nominations/${voterId}/${crypto.randomUUID()}.webp`;
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!positionId) return;

    setSubmitting(true);
    setError(null);
    const result = await submitNomination(positionId, { tagline, manifesto, photo_path: photoPath });
    setSubmitting(false);

    if (!result.ok) {
      setError(result.error ?? "Something went wrong");
      return;
    }

    toast.success("Application submitted");
    setPositionId("");
    setTagline("");
    setManifesto("");
    setPhotoPath(null);
    router.refresh();
  }

  const photoUrl = candidatePhotoUrl(photoPath);

  return (
    <div className="space-y-8">
      {myApplications.length > 0 ? (
        <div className="space-y-2">
          <p className="text-sm font-medium text-ink-2">Your applications</p>
          {myApplications.map((a) => (
            <div key={a.positionId} className="rounded-xl border border-border bg-surface p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-ink">{a.positionTitle}</p>
                <StatusBadge status={a.status} />
              </div>
              {a.status === "rejected" && a.rejectionReason ? (
                <p className="mt-1 text-xs text-red-c">{a.rejectionReason}</p>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      {positions.length > 0 ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-sm font-medium text-ink-2">Apply for a position</p>

          <div className="space-y-1.5">
            <Label>Position</Label>
            <Select items={positionItems} value={positionId} onValueChange={(v) => setPositionId(v as string)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose a position" />
              </SelectTrigger>
              <SelectContent>
                {positions.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-surface-2">
              {photoUrl ? (
                <Image src={photoUrl} alt="" width={64} height={64} className="size-16 object-cover" unoptimized />
              ) : (
                <span className="text-xs text-caption">No photo</span>
              )}
            </div>
            <div>
              <Label htmlFor="nomination-photo" className="cursor-pointer text-teal">
                {uploading ? "Uploading…" : "Upload photo"}
              </Label>
              <input
                id="nomination-photo"
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploading}
                onChange={handlePhotoChange}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="nomination-tagline">Tagline</Label>
            <Input
              id="nomination-tagline"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              maxLength={140}
              placeholder="One line, shown on the ballot card"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="nomination-manifesto">Manifesto</Label>
            <Textarea
              id="nomination-manifesto"
              value={manifesto}
              onChange={(e) => setManifesto(e.target.value)}
              rows={6}
              maxLength={2000}
              placeholder="Tell voters why you're running"
              required
            />
            <p className="text-right text-xs text-caption">{manifesto.length}/2000</p>
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <Button
            type="submit"
            className="w-full"
            disabled={submitting || !positionId || !manifesto.trim() || uploading}
          >
            {submitting ? "Submitting…" : "Submit application"}
          </Button>
        </form>
      ) : (
        <p className="text-sm text-caption">You&apos;ve applied for every position you&apos;re eligible for.</p>
      )}
    </div>
  );
}

export { NominationForm };
