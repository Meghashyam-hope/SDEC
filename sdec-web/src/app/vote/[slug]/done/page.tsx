import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ReceiptCard } from "./ReceiptCard";

export const metadata: Metadata = {
  title: "Vote cast",
};

export default async function VoteDonePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const voter = profile.voters;
  if (!voter) redirect("/dashboard");

  const supabase = await createClient();
  const { data: election } = await supabase.from("elections").select("id, title").eq("slug", slug).single();
  if (!election) notFound();

  const { data: participation } = await supabase
    .from("voter_participation")
    .select("voted_at")
    .eq("election_id", election.id)
    .eq("voter_id", voter.id)
    .maybeSingle();

  if (!participation) redirect(`/vote/${slug}`);

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <AppHeader session={{ displayName: voter.full_name, href: "/dashboard" }} />
      <main className="mx-auto flex w-full max-w-(--breakpoint-sm) flex-1 items-center justify-center px-4 py-12 sm:px-6">
        <ReceiptCard slug={slug} electionTitle={election.title} />
      </main>
    </div>
  );
}
