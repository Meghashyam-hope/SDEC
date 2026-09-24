"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generatePassword } from "@/lib/password";
import type { Database } from "@/lib/database.types";

type AppRole = Database["public"]["Enums"]["app_role"];

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

export interface SetVoterRoleResult {
  ok: boolean;
  error?: "not_authorized" | "voter_not_found";
  /** Set only when this call just provisioned a brand-new login (voter
   * had no account yet) — show it once so the admin can hand it over. */
  generatedPassword?: string;
}

/**
 * Promote/demote a voter to officer/admin (or back to student). Only
 * admins can do this (SDEC_PLAN §3 role table). Every voter gets their
 * login provisioned at CSV import time now (see actions/voters.ts), so
 * this almost always just updates their existing profile — the
 * no-account branch below only matters for voters imported before this
 * build had password auth.
 */
export async function setVoterRole(voterId: string, role: AppRole): Promise<SetVoterRoleResult> {
  const admin_user = await requireAdmin();
  if (!admin_user) return { ok: false, error: "not_authorized" };

  const supabase = await createClient();

  const { data: voter, error: voterError } = await supabase
    .from("voters")
    .select("id, user_id, full_name, roll_number, email")
    .eq("id", voterId)
    .single();

  if (voterError || !voter) return { ok: false, error: "voter_not_found" };

  let generatedPassword: string | undefined;

  if (voter.user_id) {
    const { error } = await supabase.from("profiles").update({ role }).eq("id", voter.user_id);
    if (error) return { ok: false, error: "not_authorized" };
  } else {
    const admin = createAdminClient();
    generatedPassword = generatePassword();
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email: voter.email,
      password: generatedPassword,
      email_confirm: true,
    });
    if (createError || !created.user) return { ok: false, error: "not_authorized" };

    // handle_new_auth_user() just linked voters.user_id and inserted the
    // profiles row with role='student' — set the real role now.
    const { error: roleError } = await admin.from("profiles").update({ role }).eq("id", created.user.id);
    if (roleError) return { ok: false, error: "not_authorized" };
  }

  await supabase.rpc("write_audit_log", {
    p_action: "team.set_role",
    p_entity: "voters",
    p_entity_id: voterId,
    p_meta: { role, roll_number: voter.roll_number, provisioned: !voter.user_id },
  });

  revalidatePath("/admin/team");
  return { ok: true, generatedPassword };
}

export interface SetProfileRoleResult {
  ok: boolean;
  error?: "not_authorized";
}

/**
 * Change an existing profile's role directly — for commission members who
 * signed in without ever being on the voter roll (e.g. a faculty advisor
 * seeded straight into auth.users/profiles). Always applies immediately,
 * since a profile already existing means their account already exists.
 */
export async function setProfileRole(profileId: string, role: AppRole): Promise<SetProfileRoleResult> {
  const admin_user = await requireAdmin();
  if (!admin_user) return { ok: false, error: "not_authorized" };

  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ role }).eq("id", profileId);
  if (error) return { ok: false, error: "not_authorized" };

  await supabase.rpc("write_audit_log", {
    p_action: "team.set_role",
    p_entity: "profiles",
    p_entity_id: profileId,
    p_meta: { role, applied_immediately: true },
  });

  revalidatePath("/admin/team");
  return { ok: true };
}
