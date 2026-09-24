import "server-only";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/database.types";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"] & {
  voters: Database["public"]["Tables"]["voters"]["Row"] | null;
};

/** The signed-in user's profile (+ linked voter row, if any), or null. */
export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*, voters(*)")
    .eq("id", user.id)
    .single();

  return profile as Profile | null;
}

/**
 * The signed-in user if they're an officer or admin, else null. Shared by
 * server actions that officers and admins both use — building/running
 * elections (SDEC_PLAN §3), not just admin-only voter roll/team management.
 */
export async function requireOfficerOrAdmin(): Promise<User | null> {
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

  return profile?.role === "officer" || profile?.role === "admin" ? user : null;
}
