"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
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
  /** true if the role takes effect immediately vs. on their next sign-in. */
  appliedImmediately?: boolean;
}

/**
 * Promote/demote a voter to officer/admin (or back to student). Only
 * admins can do this (SDEC_PLAN §3 role table). If the voter has already
 * signed in at least once (voters.user_id set), the change applies to
 * their profile immediately; otherwise it's staged on voters.pending_role
 * and consumed by the first-login trigger the next time they sign in.
 */
export async function setVoterRole(voterId: string, role: AppRole): Promise<SetVoterRoleResult> {
  const admin_user = await requireAdmin();
  if (!admin_user) return { ok: false, error: "not_authorized" };

  const supabase = await createClient();

  const { data: voter, error: voterError } = await supabase
    .from("voters")
    .select("id, user_id, full_name, roll_number")
    .eq("id", voterId)
    .single();

  if (voterError || !voter) return { ok: false, error: "voter_not_found" };

  if (voter.user_id) {
    const { error } = await supabase
      .from("profiles")
      .update({ role })
      .eq("id", voter.user_id);
    if (error) return { ok: false, error: "not_authorized" };
  } else {
    const { error } = await supabase
      .from("voters")
      .update({ pending_role: role === "student" ? null : role })
      .eq("id", voterId);
    if (error) return { ok: false, error: "not_authorized" };
  }

  await supabase.rpc("write_audit_log", {
    p_action: "team.set_role",
    p_entity: "voters",
    p_entity_id: voterId,
    p_meta: { role, roll_number: voter.roll_number, applied_immediately: !!voter.user_id },
  });

  revalidatePath("/admin/team");
  return { ok: true, appliedImmediately: !!voter.user_id };
}

export interface SetProfileRoleResult {
  ok: boolean;
  error?: "not_authorized";
}

/**
 * Change an existing profile's role directly — for commission members who
 * signed in without ever being on the voter roll (e.g. a faculty advisor
 * seeded straight into auth.users/profiles). Always applies immediately,
 * since a profile already existing means they've already signed in once.
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
