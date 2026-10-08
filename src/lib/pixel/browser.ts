"use client";

import { normalizePixelContents, pixelContentIds } from "@/lib/pixel/contents";
import { tiktokIdentifyPayload, type PixelCustomer } from "@/lib/pixel/customer";
import { buildTikTokProperties, TIKTOK_EVENT_NAME } from "@/lib/pixel/tiktok-payload";
import type { PixelContentItem, PixelEventName } from "@/lib/pixel/types";

type FbqFn = (...args: unknown[]) => void;
type TtqFn = {
  track: (event: string, params?: Record<string, unknown>, options?: { event_id?: string }) => void;
  page: () => void;
  identify?: (params: Record<string, unknown>) => void;
  load: (pixelId: string) => void;
};

declare global {
  interface Window {
    fbq?: FbqFn;
    _fbq?: FbqFn;
    ttq?: TtqFn;
    __ecoPageEventId?: string;
  }
}

/** Meta standard event names (Events Manager funnel). */
const META_BROWSER_EVENT: Record<PixelEventName, string> = {
  PageView: "PageView",
  ViewContent: "ViewContent",
  AddToCart: "AddToCart",
  InitiateCheckout: "InitiateCheckout",
  Purchase: "Purchase",
};

export function createEventId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `evt_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

/** Event id stamped by the base pixel snippet so the first Pageview can be deduped with CAPI. */
export function readBootPageEventId(): string | undefined {
  if (typeof window === "undefined") return undefined;
  const value = window.__ecoPageEventId?.trim();
  return value || undefined;
}

export function readCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

export function getBrowserIds() {
  return {
    fbp: readCookie("_fbp"),
    fbc: readCookie("_fbc"),
    ttp: readCookie("_ttp"),
    ttclid: readCookie("ttclid"),
    clientUserAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
  };
}

type BrowserTrackInput = {
  eventName: PixelEventName;
  eventId: string;
  value?: number;
  currency?: string;
  contentIds?: string[];
  contents?: PixelContentItem[];
  contentType?: string;
  contentName?: string;
  numItems?: number;
  orderId?: string;
  user?: PixelCustomer;
};

/** Attach email / phone so later ttq events pass TikTok advanced matching. */
export function identifyTikTokCustomer(user?: PixelCustomer) {
  if (typeof window === "undefined" || !user) return;
  const payload = tiktokIdentifyPayload(user);
  if (!payload) return;
  try {
    window.ttq?.identify?.(payload);
  } catch {
    /* ignore */
  }
}

function needsCommerceContents(eventName: PixelEventName) {
  return (
    eventName === "ViewContent" ||
    eventName === "AddToCart" ||
    eventName === "InitiateCheckout" ||
    eventName === "Purchase"
  );
}

function buildMetaParams(
  input: BrowserTrackInput,
  contents: PixelContentItem[],
): Record<string, unknown> {
  const params: Record<string, unknown> = {};
  if (input.currency) params.currency = input.currency;
  if (input.value != null) params.value = input.value;
  if (contents.length) {
    params.content_ids = pixelContentIds(contents);
    params.contents = contents.map((item) => ({
      id: item.id,
      quantity: item.quantity,
      item_price: item.item_price,
    }));
  }
  params.content_type = input.contentType ?? "product";
  if (input.contentName) params.content_name = input.contentName;
  if (input.numItems != null) params.num_items = input.numItems;
  if (input.orderId) params.order_id = input.orderId;
  return params;
}

function fireMeta(input: BrowserTrackInput, contents: PixelContentItem[]) {
  if (typeof window.fbq !== "function") return false;
  window.fbq("track", META_BROWSER_EVENT[input.eventName], buildMetaParams(input, contents), {
    eventID: input.eventId,
  });
  return true;
}

function fireTikTok(input: BrowserTrackInput) {
  identifyTikTokCustomer(input.user);
  if (typeof window.ttq?.track !== "function") return false;
  window.ttq.track(TIKTOK_EVENT_NAME[input.eventName], buildTikTokProperties(input), {
    event_id: input.eventId,
  });
  return true;
}

/** Fire Meta + TikTok browser events; retry briefly until stubs are ready. */
export function trackBrowserPixel(input: BrowserTrackInput) {
  if (typeof window === "undefined") return;

  const contents = normalizePixelContents(input.contents, input.contentIds);
  if (needsCommerceContents(input.eventName) && contents.length === 0) {
    console.warn(`[pixel] skipped ${input.eventName}: missing content_id`);
    return;
  }

  const sent = { meta: false, tiktok: false };

  const tick = () => {
    if (!sent.meta) {
      try {
        sent.meta = fireMeta(input, contents);
      } catch {
        /* ignore */
      }
    }
    if (!sent.tiktok) {
      try {
        sent.tiktok = fireTikTok(input);
      } catch {
        /* ignore */
      }
    }
  };

  tick();
  if (sent.meta && sent.tiktok) return;

  let tries = 0;
  const timer = window.setInterval(() => {
    tries += 1;
    tick();
    const metaDone = sent.meta || (typeof window.fbq !== "function" && tries >= 10);
    const tiktokDone = sent.tiktok || (typeof window.ttq?.track !== "function" && tries >= 10);
    if ((metaDone && tiktokDone) || tries >= 25) window.clearInterval(timer);
  }, 200);
}
