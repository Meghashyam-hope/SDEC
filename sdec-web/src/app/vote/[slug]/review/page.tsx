import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { getBallotPositions } from "@/lib/ballot-positions";
import { resolveVoteAccess, voteGuardCopy } from "@/lib/vote-access";
import { VoteGuard } from "../VoteGuard";
import { ReviewSheet } from "./ReviewSheet";

export const metadata: Metadata = {
  title: "Review your ballot",
};

export default async function ReviewPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const access = await resolveVoteAccess(slug);

  if (!access.ok) {
    if (access.reason === "signed_out") redirect(`/login?next=/vote/${slug}/review`);
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

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <AppHeader session={{ displayName: voter.full_name, href: "/dashboard" }} />
      <main className="mx-auto w-full max-w-(--breakpoint-sm) flex-1 px-4 py-8 sm:px-6">
        <h1 className="font-heading text-xl font-semibold text-navy">Review your ballot</h1>
        <p className="mt-1 text-sm text-caption">{election.title}</p>
        <div className="mt-6">
          <ReviewSheet slug={slug} positions={positions} />
        </div>
      </main>
    </div>
  );
}
