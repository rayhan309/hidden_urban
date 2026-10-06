/** Client-safe PII normalization. Hashing stays in hash.ts (Node crypto). */

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Digits only, with Bangladesh country code.
 * TikTok / Meta hash this form (no plus, no leading zero).
 */
export function normalizePhoneDigits(phone: string): string {
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("0") && digits.length === 11) {
    digits = `880${digits.slice(1)}`;
  }
  if (digits.length === 10 && digits.startsWith("1")) {
    digits = `880${digits}`;
  }
  return digits;
}

/** E.164, e.g. +8801712345678. TikTok pixel identify expects this shape. */
export function toE164Phone(phone: string | undefined): string | undefined {
  if (!phone?.trim()) return undefined;
  const digits = normalizePhoneDigits(phone);
  if (digits.length < 11) return undefined;
  return `+${digits}`;
}
