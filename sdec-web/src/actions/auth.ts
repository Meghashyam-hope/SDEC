"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rollNumberSchema, emailSchema, passwordSchema } from "@/lib/validators/auth";

type SignInResult =
  | { ok: true }
  | { ok: false; error: "invalid_credentials" | "too_many_attempts" | "unknown" };

type ClaimAccountError = "invalid_details" | "weak_password" | "too_many_attempts" | "unknown";
type ClaimAccountResult = { ok: true } | { ok: false; error: ClaimAccountError };

function normalizePhone(input: string): string {
  return input.replace(/\D/g, "");
}

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

/**
 * Self-service password setup for a voter already on the roll (no admin
 * action needed). Roll number + the phone number on file (from CSV
 * import) stands in for identity proof since there's no OTP/email/SMS to
 * verify with otherwise — a voter missing a phone number on their record
 * can't use this and needs an admin's "Reset password" instead.
 *
 * Doubles as self-service "forgot password": if the voter already has an
 * account, this resets it rather than failing, using the same phone
 * check. Signs the voter in immediately on success.
 */
export async function claimVoterAccount(
  rollNumberRaw: string,
  phoneRaw: string,
  newPassword: string,
): Promise<ClaimAccountResult> {
  const rollParsed = rollNumberSchema.safeParse(rollNumberRaw);
  if (!rollParsed.success) return { ok: false, error: "invalid_details" };

  const passwordParsed = passwordSchema.safeParse(newPassword);
  if (!passwordParsed.success) return { ok: false, error: "weak_password" };

  const phone = normalizePhone(phoneRaw);
  if (phone.length < 7) return { ok: false, error: "invalid_details" };

  const supabase = await createClient();
  const ip = await clientIp();

  // Reused purely for its rate-limit bookkeeping (login_lookup_attempts) —
  // same throttle signInStudent relies on for roll-number lookups.
  const { error: throttleError } = await supabase.rpc("lookup_voter_for_login", {
    p_roll: rollParsed.data,
    p_ip: ip,
  });
  if (throttleError?.message === "too_many_attempts") {
    return { ok: false, error: "too_many_attempts" };
  }

  const admin = createAdminClient();
  const { data: voter } = await admin
    .from("voters")
    .select("id, user_id, email, phone")
    .eq("roll_number", rollParsed.data)
    .eq("is_active", true)
    .maybeSingle();

  if (!voter || !voter.phone || normalizePhone(voter.phone) !== phone) {
    return { ok: false, error: "invalid_details" };
  }

  let userId: string;
  if (voter.user_id) {
    userId = voter.user_id;
    const { error } = await admin.auth.admin.updateUserById(userId, { password: passwordParsed.data });
    if (error) return { ok: false, error: "unknown" };
  } else {
    const { data: created, error } = await admin.auth.admin.createUser({
      email: voter.email,
      password: passwordParsed.data,
      email_confirm: true,
    });
    if (error || !created.user) return { ok: false, error: "unknown" };
    userId = created.user.id;
  }

  await admin.from("audit_log").insert({
    actor_id: userId,
    action: voter.user_id ? "voters.self_service_password_reset" : "voters.self_service_signup",
    entity: "voters",
    entity_id: voter.id,
  });

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: voter.email,
    password: passwordParsed.data,
  });
  if (signInError) return { ok: false, error: "unknown" };

  return { ok: true };
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
}
