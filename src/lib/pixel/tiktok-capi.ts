import type { SiteSettings } from "@/types/site-settings";
import { normalizePixelContents } from "@/lib/pixel/contents";
import { hashEmail, hashPhone } from "@/lib/pixel/hash";
import type { PixelEventName, PixelEventPayload } from "@/lib/pixel/types";

const TIKTOK_EVENTS_URL = "https://business-api.tiktok.com/open_api/v1.3/event/track/";

const TIKTOK_EVENT_MAP: Record<PixelEventName, string> = {
  PageView: "Pageview",
  ViewContent: "ViewContent",
  AddToCart: "AddToCart",
  InitiateCheckout: "InitiateCheckout",
  Purchase: "CompletePayment",
};

function buildUser(payload: PixelEventPayload) {
  const user: Record<string, unknown> = {};
  const email = hashEmail(payload.user?.email);
  const phone = hashPhone(payload.user?.phone);
  if (email) user.email = email;
  if (phone) user.phone = phone;
  if (payload.browser?.ttp) user.ttp = payload.browser.ttp;
  if (payload.browser?.ttclid) user.ttclid = payload.browser.ttclid;
  if (payload.browser?.clientIpAddress) user.ip = payload.browser.clientIpAddress;
  if (payload.browser?.clientUserAgent) user.user_agent = payload.browser.clientUserAgent;
  return user;
}

function buildProperties(payload: PixelEventPayload) {
  const properties: Record<string, unknown> = {
    content_type: payload.contentType ?? "product",
  };
  if (payload.currency) properties.currency = payload.currency;
  if (payload.value != null) properties.value = payload.value;
  if (payload.contentName) properties.content_name = payload.contentName;
  if (payload.orderId) properties.order_id = payload.orderId;

  const contents = normalizePixelContents(payload.contents, payload.contentIds);
  if (contents.length) {
    properties.contents = contents.map((item) => ({
      content_id: item.id,
      content_type: payload.contentType ?? "product",
      content_name: payload.contentName,
      quantity: item.quantity,
      price: item.item_price,
    }));
    properties.content_id = contents.map((item) => item.id).join(",");
  }

  return properties;
}

function shouldSendTikTokCapi(settings: SiteSettings): boolean {
  const pixelId = settings.tiktokPixelId.trim();
  const token = settings.tiktokCapiToken.trim();
  if (!pixelId || !token) return false;
  // Send when CAPI is on, or when a test event code is set (Events Manager testing).
  return settings.tiktokCapiEnabled || Boolean(settings.tiktokCapiTestEventCode.trim());
}

export async function sendTikTokCapiEvent(
  settings: SiteSettings,
  payload: PixelEventPayload,
): Promise<void> {
  if (!shouldSendTikTokCapi(settings)) return;

  const eventPayload: Record<string, unknown> = {
    event: TIKTOK_EVENT_MAP[payload.eventName],
    event_time: Math.floor(Date.now() / 1000),
    event_id: payload.eventId,
    user: buildUser(payload),
    properties: buildProperties(payload),
  };

  if (payload.eventSourceUrl) {
    eventPayload.page = { url: payload.eventSourceUrl };
  }

  const body: Record<string, unknown> = {
    event_source: "web",
    event_source_id: settings.tiktokPixelId.trim(),
    data: [eventPayload],
  };

  const testCode = settings.tiktokCapiTestEventCode.trim();
  if (testCode) body.test_event_code = testCode;

  const response = await fetch(TIKTOK_EVENTS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Access-Token": settings.tiktokCapiToken.trim(),
    },
    body: JSON.stringify(body),
  });

  const text = await response.text().catch(() => "");
  let code: number | undefined;
  try {
    const parsed = JSON.parse(text) as { code?: number };
    code = parsed.code;
  } catch {
    code = undefined;
  }
  if (!response.ok || (code != null && code !== 0)) {
    console.error("[tiktok-capi]", response.status, text.slice(0, 500));
  }
}
