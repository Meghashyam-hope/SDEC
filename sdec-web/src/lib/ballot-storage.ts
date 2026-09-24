/**
 * Client-only, per-election sessionStorage for the ballot stepper
 * (SDEC_PLAN §10 Phase 4: "kept in client state + sessionStorage so a
 * refresh doesn't lose them") and for handing the one-time receipt code
 * from the review step to the done screen without a URL param or a
 * server-side store — `cast_ballot` never persists it in plain text.
 */
export interface BallotSelectionEntry {
  position_id: string;
  is_nota: boolean;
  candidate_ids: string[];
}

function selectionsKey(slug: string): string {
  return `sdec:ballot:${slug}`;
}

function receiptKey(slug: string): string {
  return `sdec:receipt:${slug}`;
}

export function loadSelections(slug: string): Record<string, BallotSelectionEntry> {
  try {
    const raw = sessionStorage.getItem(selectionsKey(slug));
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveSelections(slug: string, selections: Record<string, BallotSelectionEntry>): void {
  try {
    sessionStorage.setItem(selectionsKey(slug), JSON.stringify(selections));
  } catch {
    // sessionStorage unavailable (private mode, etc.) — selections just won't survive a refresh
  }
}

export function clearSelections(slug: string): void {
  try {
    sessionStorage.removeItem(selectionsKey(slug));
  } catch {
    // ignore
  }
}

export function saveReceipt(slug: string, code: string): void {
  try {
    sessionStorage.setItem(receiptKey(slug), code);
  } catch {
    // ignore
  }
}

/** Reads and immediately clears the receipt — it's shown once. */
export function takeReceipt(slug: string): string | null {
  try {
    const code = sessionStorage.getItem(receiptKey(slug));
    sessionStorage.removeItem(receiptKey(slug));
    return code;
  } catch {
    return null;
  }
}
