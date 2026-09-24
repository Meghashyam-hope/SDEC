"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rollNumberSchema, emailSchema, otpCodeSchema } from "@/lib/validators/auth";

/**
 * Until real SMTP is configured (SDEC_PLAN §5, Phase 7), set
 * AUTH_DEV_BYPASS=true to skip sending an actual email. The OTP is still a
 * genuine Supabase Auth code (created via the admin API's generateLink,
 * which never emails it) — verification goes through the exact same
 * verifyOtp() call either way, so nothing else changes when real email is
 * wired up later.
 */
const DEV_BYPASS = process.env.AUTH_DEV_BYPASS === "true";

type OtpRequestResult =
  | { ok: true; maskedEmail: string; devCode?: string }
  | { ok: false; error: "not_found" | "too_many_attempts" | "unknown" };

type OtpVerifyResult =
  | { ok: true }
  | { ok: false; error: "invalid_code" | "not_found" | "unknown" };

async function clientIp(): Promise<string | null> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return h.get("x-real-ip");
}

export async function requestStudentOtp(rollNumberRaw: string): Promise<OtpRequestResult> {
  const parsed = rollNumberSchema.safeParse(rollNumberRaw);
  if (!parsed.success) return { ok: false, error: "not_found" };
  const rollNumber = parsed.data;

  const supabase = await createClient();
  const ip = await clientIp();

  const { data, error } = await supabase.rpc("lookup_voter_for_login", {
    p_roll: rollNumber,
    p_ip: ip,
  });

  if (error) {
    if (error.message === "too_many_attempts") {
      return { ok: false, error: "too_many_attempts" };
    }
    return { ok: false, error: "unknown" };
  }

  const result = data as { found: boolean; masked_email?: string };
  if (!result.found || !result.masked_email) {
    return { ok: false, error: "not_found" };
  }

  const admin = createAdminClient();
  const { data: voter } = await admin
    .from("voters")
    .select("email")
    .eq("roll_number", rollNumber)
    .eq("is_active", true)
    .single();

  if (!voter) return { ok: false, error: "not_found" };

  if (DEV_BYPASS) {
    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email: voter.email,
    });
    if (linkError) return { ok: false, error: "unknown" };
    return {
      ok: true,
      maskedEmail: result.masked_email,
      devCode: linkData.properties.email_otp,
    };
  }

  const { error: otpError } = await supabase.auth.signInWithOtp({ email: voter.email });
  if (otpError) return { ok: false, error: "unknown" };

  return { ok: true, maskedEmail: result.masked_email };
}

export async function verifyStudentOtp(
  rollNumberRaw: string,
  codeRaw: string,
): Promise<OtpVerifyResult> {
  const rollParsed = rollNumberSchema.safeParse(rollNumberRaw);
  const codeParsed = otpCodeSchema.safeParse(codeRaw);
  if (!rollParsed.success || !codeParsed.success) {
    return { ok: false, error: "invalid_code" };
  }

  const admin = createAdminClient();
  const { data: voter } = await admin
    .from("voters")
    .select("email")
    .eq("roll_number", rollParsed.data)
    .eq("is_active", true)
    .single();

  if (!voter) return { ok: false, error: "not_found" };

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    email: voter.email,
    token: codeParsed.data,
    type: "email",
  });

  if (error) return { ok: false, error: "invalid_code" };
  return { ok: true };
}

export async function requestAdminOtp(emailRaw: string): Promise<OtpRequestResult> {
  const parsed = emailSchema.safeParse(emailRaw);
  if (!parsed.success) return { ok: false, error: "unknown" };
  const email = parsed.data;

  const supabase = await createClient();
  const { data: allowed } = await supabase.rpc("is_admin_login_allowed", { p_email: email });
  if (!allowed) return { ok: false, error: "not_found" };

  if (DEV_BYPASS) {
    const admin = createAdminClient();
    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email,
    });
    if (linkError) return { ok: false, error: "unknown" };
    return { ok: true, maskedEmail: email, devCode: linkData.properties.email_otp };
  }

  const { error: otpError } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: false },
  });
  if (otpError) return { ok: false, error: "unknown" };

  return { ok: true, maskedEmail: email };
}

export async function verifyAdminOtp(emailRaw: string, codeRaw: string): Promise<OtpVerifyResult> {
  const emailParsed = emailSchema.safeParse(emailRaw);
  const codeParsed = otpCodeSchema.safeParse(codeRaw);
  if (!emailParsed.success || !codeParsed.success) {
    return { ok: false, error: "invalid_code" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    email: emailParsed.data,
    token: codeParsed.data,
    type: "email",
  });

  if (error) return { ok: false, error: "invalid_code" };
  return { ok: true };
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
}
