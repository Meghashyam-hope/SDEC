import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { getBallotPositions } from "@/lib/ballot-positions";
import { resolveVoteAccess, voteGuardCopy } from "@/lib/vote-access";
import { VoteGuard } from "./VoteGuard";
import { BallotStepper } from "./BallotStepper";

export const metadata: Metadata = {
  title: "Vote",
};

export default async function VotePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ position?: string }>;
}) {
  const { slug } = await params;
  const { position: initialPositionId } = await searchParams;
  const access = await resolveVoteAccess(slug);

  if (!access.ok) {
    if (access.reason === "signed_out") redirect(`/login?next=/vote/${slug}`);
    if (access.reason === "not_found") notFound();
    const copy = voteGuardCopy(access)!;
    return <VoteGuard displayName={copy.displayName} title={copy.title} message={copy.message} />;
  }

  const { voter, election } = access;
  const positions = await getBallotPositions(election.id, {
    department: voter.department,
    year: voter.year,
    section: voter.section,
  });

  if (positions.length === 0) {
    return (
      <VoteGuard
        displayName={voter.full_name}
        title={election.title}
        message="There's nothing on the ballot for you in this election."
      />
    );
  }

  const initialStep = initialPositionId
    ? Math.max(0, positions.findIndex((p) => p.id === initialPositionId))
    : 0;

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <AppHeader session={{ displayName: voter.full_name, href: "/dashboard" }} />
      <BallotStepper slug={slug} allowNota={election.allow_nota} positions={positions} initialStep={initialStep} />
    </div>
  );
}
