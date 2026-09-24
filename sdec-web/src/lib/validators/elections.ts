import { z } from "zod";
import { istInputToUtcIso } from "@/lib/ist-time";
import type { Eligibility } from "@/lib/eligibility";

export const eligibilitySchema = z.object({
  departments: z.array(z.string()).default([]),
  years: z.array(z.number().int().min(1).max(5)).default([]),
  sections: z.array(z.string()).default([]),
});

export type EligibilityInput = z.infer<typeof eligibilitySchema>;

export const RESULTS_VISIBILITY = ["after_close", "manual", "live"] as const;
export type ResultsVisibility = (typeof RESULTS_VISIBILITY)[number];

export const RESULTS_VISIBILITY_LABEL: Record<ResultsVisibility, string> = {
  after_close: "After voting closes",
  manual: "Only when I publish them",
  live: "Live, while voting is open",
};

/**
 * The raw shape an <ElectionForm> submits: `starts_at`/`ends_at`/the
 * nominations fields are still IST `datetime-local` strings ("" when a
 * nominations field is unset) — `electionDetailsSchema` below converts them
 * to UTC ISO. This is what `createElection`/`updateElectionDetails` accept.
 */
export interface ElectionFormValues {
  title: string;
  description: string;
  starts_at: string;
  ends_at: string;
  nominations_open_at: string;
  nominations_close_at: string;
  results_visibility: ResultsVisibility;
  allow_nota: boolean;
  eligibility: Eligibility;
}

/**
 * `starts_at`/`ends_at`/nominations fields come in as `datetime-local`
 * strings entered in IST and are transformed to UTC ISO strings here, so
 * everything downstream (refine comparisons, the DB insert) works in
 * absolute time.
 */
export const electionDetailsSchema = z
  .object({
    title: z.string().trim().min(3, "Title must be at least 3 characters").max(120),
    description: z
      .string()
      .trim()
      .max(2000)
      .optional()
      .transform((v) => v || null),
    starts_at: z.string().min(1, "Start date/time is required").transform(istInputToUtcIso),
    ends_at: z.string().min(1, "End date/time is required").transform(istInputToUtcIso),
    nominations_open_at: z
      .string()
      .optional()
      .transform((v) => (v ? istInputToUtcIso(v) : null)),
    nominations_close_at: z
      .string()
      .optional()
      .transform((v) => (v ? istInputToUtcIso(v) : null)),
    results_visibility: z.enum(RESULTS_VISIBILITY),
    allow_nota: z.boolean().default(false),
    eligibility: eligibilitySchema,
  })
  .refine((v) => new Date(v.ends_at) > new Date(v.starts_at), {
    message: "End must be after the start time",
    path: ["ends_at"],
  })
  .refine(
    (v) =>
      !v.nominations_open_at ||
      !v.nominations_close_at ||
      new Date(v.nominations_close_at) > new Date(v.nominations_open_at),
    { message: "Nominations must close after they open", path: ["nominations_close_at"] },
  )
  .refine((v) => !v.nominations_close_at || new Date(v.nominations_close_at) <= new Date(v.starts_at), {
    message: "Nominations must close before voting starts",
    path: ["nominations_close_at"],
  });

export type ElectionDetailsInput = z.infer<typeof electionDetailsSchema>;
