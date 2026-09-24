import { z } from "zod";

export const nominationSchema = z.object({
  tagline: z
    .string()
    .trim()
    .max(140, "Keep the tagline under 140 characters")
    .optional()
    .transform((v) => v || null),
  manifesto: z
    .string()
    .trim()
    .min(1, "Tell voters why you're running")
    .max(2000, "Keep the manifesto under 2000 characters"),
  photo_path: z.string().optional().nullable(),
});

export type NominationInput = z.infer<typeof nominationSchema>;
