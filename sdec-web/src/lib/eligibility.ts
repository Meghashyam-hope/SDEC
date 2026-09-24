/** Mirrors the `eligibility` jsonb shape used by the `is_eligible` SQL
 * function (SDEC_PLAN §6): empty/missing arrays mean "everyone". */
export interface Eligibility {
  departments?: string[];
  years?: number[];
  sections?: string[];
}

export interface VoterEligibilityInput {
  department: string;
  year: number;
  section: string | null;
}

/** Mirrors the `is_eligible` SQL function (supabase/migrations) exactly —
 * used client/server-side to decide which elections/positions to show a
 * given voter, before the same rule is re-checked authoritatively inside
 * `cast_ballot`. */
export function isEligible(
  eligibility: Eligibility | null | undefined,
  voter: VoterEligibilityInput,
): boolean {
  if (!eligibility) return true;

  const deptOk = !eligibility.departments?.length || eligibility.departments.includes(voter.department);
  const yearOk = !eligibility.years?.length || eligibility.years.includes(voter.year);
  const sectionOk =
    !eligibility.sections?.length || (voter.section !== null && eligibility.sections.includes(voter.section));

  return deptOk && yearOk && sectionOk;
}

export function describeEligibility(eligibility: Eligibility | null | undefined): string {
  if (!eligibility) return "All eligible voters";

  const parts: string[] = [];
  if (eligibility.departments?.length) parts.push(eligibility.departments.join(", "));
  if (eligibility.years?.length) {
    parts.push(`Year ${eligibility.years.slice().sort((a, b) => a - b).join(", ")}`);
  }
  if (eligibility.sections?.length) parts.push(`Section ${eligibility.sections.join(", ")}`);

  return parts.length > 0 ? parts.join(" · ") : "All eligible voters";
}
