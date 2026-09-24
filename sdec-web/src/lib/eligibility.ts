/** Mirrors the `eligibility` jsonb shape used by the `is_eligible` SQL
 * function (SDEC_PLAN §6): empty/missing arrays mean "everyone". */
export interface Eligibility {
  departments?: string[];
  years?: number[];
  sections?: string[];
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
