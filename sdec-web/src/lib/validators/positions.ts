import { z } from "zod";
import { eligibilitySchema } from "@/lib/validators/elections";
import type { Eligibility } from "@/lib/eligibility";

export const positionSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(120),
  description: z
    .string()
    .trim()
    .max(1000)
    .optional()
    .transform((v) => v || null),
  seats: z.coerce.number().int().min(1, "At least 1 seat").max(20, "That's a lot of seats"),
  max_choices: z.coerce.number().int().min(1, "At least 1 choice").max(20, "That's a lot of choices"),
  eligibility: eligibilitySchema,
});

export type PositionInput = z.infer<typeof positionSchema>;

/** The raw shape a <PositionFormDialog> submits, pre-validation — what
 * `createPosition`/`updatePosition` accept and parse with `positionSchema`. */
export interface PositionFormValues {
  title: string;
  description: string;
  seats: number;
  max_choices: number;
  eligibility: Eligibility;
}
