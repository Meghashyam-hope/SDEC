/**
 * Election schedule inputs are entered and displayed in Asia/Kolkata (IST,
 * UTC+5:30 — no DST) but stored as UTC `timestamptz` (SDEC_PLAN §11.5).
 */
const IST_OFFSET = "+05:30";
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/** Interprets a `datetime-local` input's wall-clock value as IST and
 * returns the equivalent UTC ISO string, ready to store. */
export function istInputToUtcIso(value: string): string {
  return new Date(`${value}:00${IST_OFFSET}`).toISOString();
}

/** Inverse of `istInputToUtcIso`, for pre-filling a `datetime-local` input
 * from a stored UTC timestamptz. */
export function utcIsoToIstInput(value: string): string {
  const ist = new Date(new Date(value).getTime() + IST_OFFSET_MS);
  return ist.toISOString().slice(0, 16);
}

const DISPLAY_FORMAT = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: true,
});

/** Formats a stored UTC timestamptz for display in IST. */
export function formatIst(value: string | Date): string {
  return DISPLAY_FORMAT.format(typeof value === "string" ? new Date(value) : value);
}
