import { z } from "zod";

export const rollNumberSchema = z
  .string()
  .trim()
  .min(1, "Enter your roll number.")
  .max(20, "That doesn't look like a roll number.")
  .transform((v) => v.toUpperCase());

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Enter a valid email address.");

/** For setting/resetting a password (CSV import, team promotion, reset).
 * Login itself only checks the password is non-empty — this is what
 * generated/admin-set passwords are validated against. */
export const passwordSchema = z.string().min(8, "Password must be at least 8 characters.");
