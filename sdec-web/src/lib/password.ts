import "server-only";
import { randomInt } from "node:crypto";

const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz";

/** A temporary password for a newly-provisioned or reset account — shown
 * once to the admin/officer who created it, for out-of-band distribution
 * (no SMTP/SMS in this build's login design). Unambiguous alphabet, no
 * `0/O/1/l/I`, matching the receipt code's readability goals. */
export function generatePassword(length = 10): string {
  return Array.from({ length }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
}
