"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { voterCsvRowSchema, type VoterCsvRow } from "@/lib/validators/voters";
import { generatePassword } from "@/lib/password";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  return profile?.role === "admin" ? user : null;
}

export interface IssuedCredential {
  roll_number: string;
  email: string;
  password: string;
}

export interface ImportVotersResult {
  ok: boolean;
  imported: number;
  /** Login passwords for newly-created voters, shown once so the admin
   * can distribute them out-of-band (no SMTP/SMS in this build's login
   * design — see CLAUDE.md). Existing voters being re-imported keep
   * whatever password they already have. */
  credentials: IssuedCredential[];
  failed: { row: number; roll_number: string; error: string }[];
}

/**
 * Bulk upsert from a validated CSV. Uses the service-role client per
 * SDEC_PLAN §11.3 — admin already has RLS rights here too, but a bad row's
 * unique-constraint collision (e.g. email reused under a different roll
 * number) shouldn't be able to abort a whole-batch RLS-checked statement,
 * so each row is upserted individually and failures are collected.
 */
export async function importVotersCsv(rows: VoterCsvRow[]): Promise<ImportVotersResult> {
  const admin_user = await requireAdmin();
  if (!admin_user) return { ok: false, imported: 0, credentials: [], failed: [] };

  const admin = createAdminClient();
  const failed: ImportVotersResult["failed"] = [];
  const credentials: ImportVotersResult["credentials"] = [];
  let imported = 0;

  for (const [index, raw] of rows.entries()) {
    const parsed = voterCsvRowSchema.safeParse(raw);
    if (!parsed.success) {
      failed.push({
        row: index + 1,
        roll_number: String(raw.roll_number ?? "?"),
        error: parsed.error.issues[0]?.message ?? "Invalid row",
      });
      continue;
    }

    const { data: existing } = await admin
      .from("voters")
      .select("id")
      .eq("roll_number", parsed.data.roll_number)
      .maybeSingle();

    const { error } = await admin
      .from("voters")
      .upsert(
        {
          roll_number: parsed.data.roll_number,
          full_name: parsed.data.full_name,
          email: parsed.data.email,
          phone: parsed.data.phone,
          department: parsed.data.department,
          year: parsed.data.year,
          section: parsed.data.section,
        },
        { onConflict: "roll_number" },
      );

    if (error) {
      failed.push({ row: index + 1, roll_number: parsed.data.roll_number, error: error.message });
      continue;
    }
    imported++;

    // Brand-new voter: provision their login now (handle_new_auth_user()
    // links voters.user_id + creates the profiles row automatically on
    // this insert, same trigger the old OTP flow relied on). Re-imported
    // voters keep whatever password they already have.
    if (!existing) {
      const password = generatePassword();
      const { error: createError } = await admin.auth.admin.createUser({
        email: parsed.data.email,
        password,
        email_confirm: true,
      });
      if (!createError) {
        credentials.push({ roll_number: parsed.data.roll_number, email: parsed.data.email, password });
      }
      // A createError here (e.g. that email already has an auth account
      // under a different roll number) doesn't fail the import — the
      // voter row is still on the roll; "Reset password" can sort out
      // their login separately once the conflict is resolved.
    }
  }

  await admin.from("audit_log").insert({
    actor_id: admin_user.id,
    action: "voters.import",
    entity: "voters",
    meta: { imported, failed: failed.length, total: rows.length, credentials_issued: credentials.length },
  });

  revalidatePath("/admin/voters");
  return { ok: true, imported, credentials, failed };
}

export interface ResetPasswordResult {
  ok: boolean;
  password?: string;
  error?: string;
}

/** Generates a fresh password for a voter — either resetting an existing
 * login or provisioning one for a voter who never got one (e.g. imported
 * before this build had password auth). Shown once for the admin to hand
 * over out-of-band. */
export async function resetVoterPassword(voterId: string): Promise<ResetPasswordResult> {
  const admin_user = await requireAdmin();
  if (!admin_user) return { ok: false, error: "Not authorized" };

  const admin = createAdminClient();
  const { data: voter } = await admin
    .from("voters")
    .select("id, user_id, email, roll_number")
    .eq("id", voterId)
    .single();
  if (!voter) return { ok: false, error: "Voter not found" };

  const password = generatePassword();

  if (voter.user_id) {
    const { error } = await admin.auth.admin.updateUserById(voter.user_id, { password });
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await admin.auth.admin.createUser({
      email: voter.email,
      password,
      email_confirm: true,
    });
    if (error) return { ok: false, error: error.message };
  }

  await admin.from("audit_log").insert({
    actor_id: admin_user.id,
    action: "voters.reset_password",
    entity: "voters",
    entity_id: voterId,
    meta: { roll_number: voter.roll_number },
  });

  revalidatePath("/admin/voters");
  return { ok: true, password };
}

export async function setVoterActive(voterId: string, isActive: boolean) {
  const admin_user = await requireAdmin();
  if (!admin_user) return { ok: false };

  const supabase = await createClient();
  const { error } = await supabase
    .from("voters")
    .update({ is_active: isActive })
    .eq("id", voterId)
    .select("id")
    .single();

  if (error) return { ok: false };

  await supabase.rpc("write_audit_log", {
    p_action: isActive ? "voters.reactivate" : "voters.deactivate",
    p_entity: "voters",
    p_entity_id: voterId,
  });

  revalidatePath("/admin/voters");
  return { ok: true };
}
