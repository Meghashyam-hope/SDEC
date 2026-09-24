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

export const otpCodeSchema = z
  .string()
  .trim()
  .regex(/^[0-9]{6}$/, "Enter the 6-digit code.");
