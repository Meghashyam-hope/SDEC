"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rollNumberSchema, emailSchema } from "@/lib/validators/auth";

type SignInResult =
  | { ok: true }
  | { ok: false; error: "invalid_credentials" | "too_many_attempts" | "unknown" };

async function clientIp(): Promise<string | null> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return h.get("x-real-ip");
}

/**
 * Students sign in with their roll number (or email) + a password an
 * admin/officer set for them (CSV import or /admin/team — see
 * actions/voters.ts and actions/team.ts). No OTP, no SMTP/SMS.
 *
 * `lookup_voter_for_login` predates this design (it was the OTP-era
 * "does this roll number exist, throttled" check) but its throttle table
 * is exactly what a password login also needs — reused as-is rather than
 * writing a second rate limiter.
 */
export async function signInStudent(identifierRaw: string, password: string): Promise<SignInResult> {
  if (!password) return { ok: false, error: "invalid_credentials" };

  const supabase = await createClient();
  const admin = createAdminClient();
  const isEmail = identifierRaw.includes("@");

  let email: string;

  if (isEmail) {
    const parsed = emailSchema.safeParse(identifierRaw);
    if (!parsed.success) return { ok: false, error: "invalid_credentials" };

    const { data: voter } = await admin
      .from("voters")
      .select("email")
      .eq("email", parsed.data)
      .eq("is_active", true)
      .maybeSingle();
    if (!voter) return { ok: false, error: "invalid_credentials" };
    email = voter.email;
  } else {
    const parsed = rollNumberSchema.safeParse(identifierRaw);
    if (!parsed.success) return { ok: false, error: "invalid_credentials" };

    const ip = await clientIp();
    const { data, error } = await supabase.rpc("lookup_voter_for_login", {
      p_roll: parsed.data,
      p_ip: ip,
    });
    if (error) {
      return { ok: false, error: error.message === "too_many_attempts" ? "too_many_attempts" : "invalid_credentials" };
    }
    const result = data as { found: boolean };
    if (!result.found) return { ok: false, error: "invalid_credentials" };

    const { data: voter } = await admin
      .from("voters")
      .select("email")
      .eq("roll_number", parsed.data)
      .eq("is_active", true)
      .maybeSingle();
    if (!voter) return { ok: false, error: "invalid_credentials" };
    email = voter.email;
  }

  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
  if (signInError) return { ok: false, error: "invalid_credentials" };
  return { ok: true };
}

/** Officers/admins sign in with email + password. `is_admin_login_allowed`
 * still gates unregistered emails before even attempting a password
 * check, same as the old OTP flow did. */
export async function signInAdmin(emailRaw: string, password: string): Promise<SignInResult> {
  const parsed = emailSchema.safeParse(emailRaw);
  if (!parsed.success || !password) return { ok: false, error: "invalid_credentials" };

  const supabase = await createClient();
  const { data: allowed } = await supabase.rpc("is_admin_login_allowed", { p_email: parsed.data });
  if (!allowed) return { ok: false, error: "invalid_credentials" };

  const { error } = await supabase.auth.signInWithPassword({ email: parsed.data, password });
  if (error) return { ok: false, error: "invalid_credentials" };
  return { ok: true };
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
}
