import { createHash } from "node:crypto";
import { normalizeEmail, normalizePhoneDigits } from "@/lib/pixel/pii";

export { normalizeEmail, normalizePhoneDigits as normalizePhone } from "@/lib/pixel/pii";

/** Meta / TikTok require SHA-256 hex of normalized PII. */
export function hashSha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function hashEmail(email: string | undefined): string | undefined {
  if (!email?.trim()) return undefined;
  return hashSha256(normalizeEmail(email));
}

export function hashPhone(phone: string | undefined): string | undefined {
  if (!phone?.trim()) return undefined;
  const normalized = normalizePhoneDigits(phone);
  if (!normalized) return undefined;
  return hashSha256(normalized);
}

export function hashName(name: string | undefined): string | undefined {
  if (!name?.trim()) return undefined;
  return hashSha256(name.trim().toLowerCase());
}
