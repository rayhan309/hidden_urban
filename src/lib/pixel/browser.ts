"use client";

import { normalizePixelContents, pixelContentIds } from "@/lib/pixel/contents";
import { tiktokIdentifyPayload, type PixelCustomer } from "@/lib/pixel/customer";
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

/** TikTok standard event names. */
const TIKTOK_BROWSER_EVENT: Record<PixelEventName, string> = {
  PageView: "Pageview",
  ViewContent: "ViewContent",
  AddToCart: "AddToCart",
  InitiateCheckout: "InitiateCheckout",
  Purchase: "CompletePayment",
};

export function createEventId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `evt_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
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

/** TikTok requires contents[].content_id (not Meta's `id`). */
function buildTikTokParams(
  input: BrowserTrackInput,
  contents: PixelContentItem[],
): Record<string, unknown> {
  const params: Record<string, unknown> = {
    content_type: input.contentType ?? "product",
  };
  if (input.currency) params.currency = input.currency;
  if (input.value != null) params.value = input.value;
  if (input.contentName) params.content_name = input.contentName;
  if (input.orderId) params.order_id = input.orderId;

  if (contents.length) {
    params.contents = contents.map((item) => ({
      content_id: item.id,
      content_type: input.contentType ?? "product",
      content_name: input.contentName,
      quantity: item.quantity,
      price: item.item_price,
    }));
    // Some TikTok diagnostics also check a top-level content_id.
    params.content_id = contents.map((item) => item.id).join(",");
  }

  return params;
}

function fireOnce(input: BrowserTrackInput): { meta: boolean; tiktok: boolean } {
  const contents = normalizePixelContents(input.contents, input.contentIds);
  if (needsCommerceContents(input.eventName) && contents.length === 0) {
    console.warn(`[pixel] skipped ${input.eventName}: missing content_id`);
    return { meta: false, tiktok: false };
  }

  let meta = false;
  let tiktok = false;

  try {
    if (typeof window.fbq === "function") {
      window.fbq("track", META_BROWSER_EVENT[input.eventName], buildMetaParams(input, contents), {
        eventID: input.eventId,
      });
      meta = true;
    }
  } catch {
    /* ignore */
  }

  try {
    identifyTikTokCustomer(input.user);
    if (typeof window.ttq?.track === "function") {
      window.ttq.track(TIKTOK_BROWSER_EVENT[input.eventName], buildTikTokParams(input, contents), {
        event_id: input.eventId,
      });
      tiktok = true;
    }
  } catch {
    /* ignore */
  }

  return { meta, tiktok };
}

/** Fire Meta + TikTok browser events; retry briefly until stubs are ready. */
export function trackBrowserPixel(input: BrowserTrackInput) {
  if (typeof window === "undefined") return;

  const result = fireOnce(input);
  if (result.meta || result.tiktok) return;

  let tries = 0;
  const timer = window.setInterval(() => {
    tries += 1;
    const again = fireOnce(input);
    if (again.meta || again.tiktok || tries >= 25) {
      window.clearInterval(timer);
    }
  }, 200);
}
