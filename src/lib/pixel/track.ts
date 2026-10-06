"use client";

import {
  createEventId,
  getBrowserIds,
  identifyTikTokCustomer,
  trackBrowserPixel,
} from "@/lib/pixel/browser";
import { mergePixelCustomer, type PixelCustomer } from "@/lib/pixel/customer";
import type { PixelContentItem, PixelEventName } from "@/lib/pixel/types";
import { api } from "@/lib/axios";

type TrackInput = {
  eventName: PixelEventName;
  value?: number;
  currency?: string;
  contentIds?: string[];
  contents?: PixelContentItem[];
  contentType?: string;
  contentName?: string;
  numItems?: number;
  orderId?: string;
  user?: PixelCustomer;
  /** When set, reuse this id (browser + CAPI dedup). */
  eventId?: string;
  /** Skip posting to our CAPI proxy (e.g. Purchase already sent server-side). */
  skipServer?: boolean;
  /** Skip browser fbq/ttq (e.g. base pixel already called page()). */
  skipBrowser?: boolean;
};

/** Save checkout email/phone and identify the TikTok pixel immediately. */
export function syncPixelCustomer(user: PixelCustomer) {
  const merged = mergePixelCustomer(user, { persist: true });
  if (merged) identifyTikTokCustomer(merged);
}

/**
 * Fire browser pixels and (optionally) server CAPI with the same event_id.
 */
export async function trackPixelEvent(input: TrackInput): Promise<string> {
  const eventId = input.eventId ?? createEventId();
  const eventSourceUrl = typeof window !== "undefined" ? window.location.href : undefined;
  const browser = getBrowserIds();
  const user = mergePixelCustomer(input.user, {
    persist: Boolean(input.user?.email?.trim() || input.user?.phone?.trim()),
  });

  if (user) identifyTikTokCustomer(user);

  if (!input.skipBrowser) {
    trackBrowserPixel({
      eventName: input.eventName,
      eventId,
      value: input.value,
      currency: input.currency,
      contentIds: input.contentIds,
      contents: input.contents,
      contentType: input.contentType ?? "product",
      contentName: input.contentName,
      numItems: input.numItems,
      orderId: input.orderId,
      user,
    });
  }

  if (!input.skipServer) {
    try {
      await api.post("/api/store/pixel-events", {
        eventName: input.eventName,
        eventId,
        eventSourceUrl,
        value: input.value,
        currency: input.currency,
        contentIds: input.contentIds,
        contents: input.contents,
        contentType: input.contentType ?? "product",
        contentName: input.contentName,
        numItems: input.numItems,
        orderId: input.orderId,
        user,
        browser,
      });
    } catch {
      /* CAPI failures must not break UX */
    }
  }

  return eventId;
}

export function cartContentsFromItems(
  items: Array<{ productId: string; slug?: string; quantity: number; price: number }>,
): PixelContentItem[] {
  return items
    .map((item) => ({
      id: String(item.productId || item.slug || "").trim(),
      quantity: item.quantity,
      item_price: item.price,
    }))
    .filter((item) => item.id.length > 0);
}
