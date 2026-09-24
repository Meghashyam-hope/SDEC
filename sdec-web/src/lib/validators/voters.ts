import { z } from "zod";

export const voterCsvRowSchema = z.object({
  roll_number: z
    .string()
    .trim()
    .min(1, "Missing roll number")
    .max(20, "Roll number too long")
    .transform((v) => v.toUpperCase()),
  full_name: z.string().trim().min(1, "Missing name"),
  email: z.string().trim().toLowerCase().email("Invalid email"),
  phone: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : null)),
  department: z.string().trim().min(1, "Missing department").toUpperCase(),
  year: z.coerce
    .number({ message: "Year must be a number" })
    .int()
    .min(1, "Year must be 1-5")
    .max(5, "Year must be 1-5"),
  section: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v.toUpperCase() : null)),
});

export type VoterCsvRow = z.infer<typeof voterCsvRowSchema>;

export const CSV_COLUMNS = [
  "roll_number",
  "full_name",
  "email",
  "phone",
  "department",
  "year",
  "section",
] as const;
