import { normalizeEmail, toE164Phone } from "@/lib/pixel/pii";
import type { PixelEventPayload } from "@/lib/pixel/types";

export type PixelCustomer = NonNullable<PixelEventPayload["user"]>;

/** Keep in sync with the inline identify call in TrackingPixels. */
export const PIXEL_CUSTOMER_STORAGE_KEY = "eco_pixel_customer";

export function tiktokIdentifyPayload(
  user: PixelCustomer | undefined,
): { email?: string; phone_number?: string } | undefined {
  if (!user) return undefined;
  const payload: { email?: string; phone_number?: string } = {};
  if (user.email?.includes("@")) payload.email = normalizeEmail(user.email);
  const phone = toE164Phone(user.phone);
  if (phone) payload.phone_number = phone;
  if (!payload.email && !payload.phone_number) return undefined;
  return payload;
}

export function readStoredPixelCustomer(): PixelCustomer | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = localStorage.getItem(PIXEL_CUSTOMER_STORAGE_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as PixelCustomer;
    if (!parsed || typeof parsed !== "object") return undefined;
    return parsed;
  } catch {
    return undefined;
  }
}

function writeStoredPixelCustomer(user: PixelCustomer) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      PIXEL_CUSTOMER_STORAGE_KEY,
      JSON.stringify({
        email: user.email,
        phone: user.phone,
        firstName: user.firstName,
        lastName: user.lastName,
        city: user.city,
        state: user.state,
        country: user.country || "bd",
      }),
    );
  } catch {
    /* private mode / quota */
  }
}

/** Merge checkout details with the browser's saved customer. Persist only real email or phone. */
export function mergePixelCustomer(
  explicit?: PixelCustomer,
  options?: { persist?: boolean },
): PixelCustomer | undefined {
  const prev = readStoredPixelCustomer() ?? {};
  const next: PixelCustomer = { ...prev };

  if (explicit?.email?.includes("@")) next.email = normalizeEmail(explicit.email);
  if (explicit?.phone?.trim()) {
    const phone = toE164Phone(explicit.phone);
    if (phone) next.phone = phone;
  }
  if (explicit?.firstName?.trim()) next.firstName = explicit.firstName.trim();
  if (explicit?.lastName?.trim()) next.lastName = explicit.lastName.trim();
  if (explicit?.city?.trim()) next.city = explicit.city.trim();
  if (explicit?.state?.trim()) next.state = explicit.state.trim();
  if (explicit?.country?.trim()) next.country = explicit.country.trim().toLowerCase();
  if (explicit?.zip?.trim()) next.zip = explicit.zip.trim();

  if (!next.email && !next.phone && !next.firstName && !next.city && !next.state) {
    return undefined;
  }

  if (options?.persist && (next.email || next.phone)) {
    writeStoredPixelCustomer(next);
  }

  return next;
}
