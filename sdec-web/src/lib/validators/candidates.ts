import { z } from "zod";

export const candidateSchema = z.object({
  display_name: z.string().trim().min(1, "Name is required").max(120),
  tagline: z
    .string()
    .trim()
    .max(140, "Keep the tagline under 140 characters")
    .optional()
    .transform((v) => v || null),
  manifesto: z
    .string()
    .trim()
    .max(4000, "Keep the manifesto under 4000 characters")
    .optional()
    .transform((v) => v || null),
  voter_id: z.string().uuid().optional().nullable(),
  photo_path: z.string().optional().nullable(),
});

export type CandidateInput = z.infer<typeof candidateSchema>;
