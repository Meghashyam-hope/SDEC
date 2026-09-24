import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { electionPhase } from "@/lib/election-phase";
import { isEligible, type Eligibility } from "@/lib/eligibility";
import { StatusGuard } from "@/components/election/StatusGuard";
import { NominationForm, type OpenPosition, type MyApplication } from "./NominationForm";

export const metadata: Metadata = {
  title: "Apply as a candidate",
};

interface RawPosition {
  id: string;
  title: string;
  eligibility: Eligibility;
}

export default async function NominatePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const profile = await getCurrentProfile();
  if (!profile) redirect(`/login?next=/nominate/${slug}`);

  const voter = profile.voters;
  if (!voter) {
    return (
      <StatusGuard
        title="You're not on the voter roll"
        message="Your account isn't linked to a voter record. Contact the election commission."
      />
    );
  }

  const supabase = await createClient();
  const { data: election } = await supabase
    .from("elections")
    .select("*")
    .eq("slug", slug)
    .eq("is_published", true)
    .single();
  if (!election) notFound();

  const phase = electionPhase(election);
  if (phase !== "nominations") {
    return (
      <StatusGuard
        displayName={voter.full_name}
        title={election.title}
        message={
          phase === "draft"
            ? "This election isn't open yet."
            : "Nominations aren't open for this election right now."
        }
      />
    );
  }

  const voterEligibility = { department: voter.department, year: voter.year, section: voter.section };
  if (!isEligible(election.eligibility as unknown as Eligibility, voterEligibility)) {
    return (
      <StatusGuard displayName={voter.full_name} title={election.title} message="You're not eligible for this election." />
    );
  }

  const { data: positionsData } = await supabase
    .from("positions")
    .select("id, title, eligibility, sort_order")
    .eq("election_id", election.id)
    .order("sort_order");

  const eligiblePositions = ((positionsData ?? []) as unknown as (RawPosition & { sort_order: number })[]).filter((p) =>
    isEligible(p.eligibility, voterEligibility),
  );

  const eligiblePositionIds = eligiblePositions.map((p) => p.id);
  const { data: existingCandidacies } =
    eligiblePositionIds.length > 0
      ? await supabase
          .from("candidates")
          .select("position_id, status, rejection_reason")
          .eq("voter_id", voter.id)
          .in("position_id", eligiblePositionIds)
      : { data: [] as { position_id: string; status: string; rejection_reason: string | null }[] };

  const appliedIds = new Set((existingCandidacies ?? []).map((c) => c.position_id));
  const openPositions: OpenPosition[] = eligiblePositions
    .filter((p) => !appliedIds.has(p.id))
    .map((p) => ({ id: p.id, title: p.title }));

  const myApplications: MyApplication[] = (existingCandidacies ?? []).map((c) => ({
    positionId: c.position_id,
    positionTitle: eligiblePositions.find((p) => p.id === c.position_id)?.title ?? "Position",
    status: c.status,
    rejectionReason: c.rejection_reason,
  }));

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <AppHeader session={{ displayName: voter.full_name, href: "/dashboard" }} />
      <main className="mx-auto w-full max-w-(--breakpoint-sm) flex-1 px-4 py-10 sm:px-6">
        <h1 className="font-heading text-xl font-semibold text-navy">Apply as a candidate</h1>
        <p className="mt-1 text-sm text-caption">{election.title}</p>
        <div className="mt-6">
          <NominationForm voterId={voter.id} positions={openPositions} myApplications={myApplications} />
        </div>
      </main>
    </div>
  );
}
