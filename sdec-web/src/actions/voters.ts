"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { voterCsvRowSchema, type VoterCsvRow } from "@/lib/validators/voters";

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

export interface ImportVotersResult {
  ok: boolean;
  imported: number;
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
  if (!admin_user) return { ok: false, imported: 0, failed: [] };

  const admin = createAdminClient();
  const failed: ImportVotersResult["failed"] = [];
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
    } else {
      imported++;
    }
  }

  await admin.from("audit_log").insert({
    actor_id: admin_user.id,
    action: "voters.import",
    entity: "voters",
    meta: { imported, failed: failed.length, total: rows.length },
  });

  revalidatePath("/admin/voters");
  return { ok: true, imported, failed };
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
