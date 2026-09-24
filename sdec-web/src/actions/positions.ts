"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireOfficerOrAdmin } from "@/lib/auth";
import { electionPhase, isStructurallyLocked } from "@/lib/election-phase";
import { positionSchema, type PositionFormValues } from "@/lib/validators/positions";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export interface PositionActionResult {
  ok: boolean;
  error?: string;
  id?: string;
}

async function assertEditable(supabase: SupabaseServerClient, electionId: string): Promise<string | null> {
  const { data: election } = await supabase.from("elections").select("*").eq("id", electionId).single();
  if (!election) return "Election not found";
  if (isStructurallyLocked(electionPhase(election))) {
    return "This election is live or has ended — positions can no longer be changed.";
  }
  return null;
}

export async function createPosition(
  electionId: string,
  input: PositionFormValues,
): Promise<PositionActionResult> {
  const user = await requireOfficerOrAdmin();
  if (!user) return { ok: false, error: "Not authorized" };

  const parsed = positionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const supabase = await createClient();
  const lockError = await assertEditable(supabase, electionId);
  if (lockError) return { ok: false, error: lockError };

  const { data: maxRow } = await supabase
    .from("positions")
    .select("sort_order")
    .eq("election_id", electionId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await supabase
    .from("positions")
    .insert({
      election_id: electionId,
      title: parsed.data.title,
      description: parsed.data.description,
      seats: parsed.data.seats,
      max_choices: parsed.data.max_choices,
      eligibility: parsed.data.eligibility,
      sort_order: (maxRow?.sort_order ?? -1) + 1,
    })
    .select("id")
    .single();

  if (error || !data) return { ok: false, error: error?.message ?? "Could not create position" };

  await supabase.rpc("write_audit_log", {
    p_action: "position.create",
    p_entity: "positions",
    p_entity_id: data.id,
    p_meta: { election_id: electionId, title: parsed.data.title },
  });

  revalidatePath(`/admin/elections/${electionId}`);
  return { ok: true, id: data.id };
}

export async function updatePosition(
  id: string,
  electionId: string,
  input: PositionFormValues,
): Promise<PositionActionResult> {
  const user = await requireOfficerOrAdmin();
  if (!user) return { ok: false, error: "Not authorized" };

  const parsed = positionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const supabase = await createClient();
  const lockError = await assertEditable(supabase, electionId);
  if (lockError) return { ok: false, error: lockError };

  const { error } = await supabase
    .from("positions")
    .update({
      title: parsed.data.title,
      description: parsed.data.description,
      seats: parsed.data.seats,
      max_choices: parsed.data.max_choices,
      eligibility: parsed.data.eligibility,
    })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };

  await supabase.rpc("write_audit_log", {
    p_action: "position.update",
    p_entity: "positions",
    p_entity_id: id,
  });

  revalidatePath(`/admin/elections/${electionId}`);
  return { ok: true, id };
}

export async function deletePosition(id: string, electionId: string): Promise<PositionActionResult> {
  const user = await requireOfficerOrAdmin();
  if (!user) return { ok: false, error: "Not authorized" };

  const supabase = await createClient();
  const lockError = await assertEditable(supabase, electionId);
  if (lockError) return { ok: false, error: lockError };

  const { error } = await supabase.from("positions").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  await supabase.rpc("write_audit_log", {
    p_action: "position.delete",
    p_entity: "positions",
    p_entity_id: id,
    p_meta: { election_id: electionId },
  });

  revalidatePath(`/admin/elections/${electionId}`);
  return { ok: true };
}

export async function reorderPositions(
  electionId: string,
  orderedIds: string[],
): Promise<PositionActionResult> {
  const user = await requireOfficerOrAdmin();
  if (!user) return { ok: false, error: "Not authorized" };

  const supabase = await createClient();
  const lockError = await assertEditable(supabase, electionId);
  if (lockError) return { ok: false, error: lockError };

  await Promise.all(
    orderedIds.map((id, index) => supabase.from("positions").update({ sort_order: index }).eq("id", id)),
  );

  revalidatePath(`/admin/elections/${electionId}`);
  return { ok: true };
}
