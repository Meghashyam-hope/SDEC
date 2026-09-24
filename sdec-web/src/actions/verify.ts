"use server";

import { createClient } from "@/lib/supabase/server";

export interface VerifyReceiptResult {
  found: boolean;
  electionTitle?: string;
}

/** Public receipt verification — proves a ballot was counted without
 * revealing anything about its contents (SDEC_PLAN §10 Phase 5). */
export async function verifyReceipt(code: string): Promise<VerifyReceiptResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("verify_receipt", { p_code: code });
  if (error || !data) return { found: false };

  const result = data as unknown as { found: boolean; election_title?: string };
  return { found: result.found, electionTitle: result.election_title };
}
