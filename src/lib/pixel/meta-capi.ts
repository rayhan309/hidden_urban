import type { SiteSettings } from "@/types/site-settings";
import { hashEmail, hashName, hashPhone } from "@/lib/pixel/hash";
import type { PixelEventPayload } from "@/lib/pixel/types";

const META_GRAPH_VERSION = "v21.0";

function buildUserData(payload: PixelEventPayload) {
  const userData: Record<string, unknown> = {};
  const em = hashEmail(payload.user?.email);
  const ph = hashPhone(payload.user?.phone);
  const fn = hashName(payload.user?.firstName);
  const ln = hashName(payload.user?.lastName);
  const ct = hashName(payload.user?.city);
  const st = hashName(payload.user?.state);
  const country = hashName(payload.user?.country);

  if (em) userData.em = [em];
  if (ph) userData.ph = [ph];
  if (fn) userData.fn = [fn];
  if (ln) userData.ln = [ln];
  if (ct) userData.ct = [ct];
  if (st) userData.st = [st];
  if (country) userData.country = [country];
  if (payload.browser?.clientIpAddress) {
    userData.client_ip_address = payload.browser.clientIpAddress;
  }
  if (payload.browser?.clientUserAgent) {
    userData.client_user_agent = payload.browser.clientUserAgent;
  }
  if (payload.browser?.fbp) userData.fbp = payload.browser.fbp;
  if (payload.browser?.fbc) userData.fbc = payload.browser.fbc;

  return userData;
}

function buildCustomData(payload: PixelEventPayload) {
  const custom: Record<string, unknown> = {};
  if (payload.currency) custom.currency = payload.currency;
  if (payload.value != null) custom.value = payload.value;
  if (payload.contentIds?.length) custom.content_ids = payload.contentIds;
  if (payload.contents?.length) {
    custom.contents = payload.contents.map((item) => ({
      id: item.id,
      quantity: item.quantity,
      item_price: item.item_price,
    }));
  }
  if (payload.contentType) custom.content_type = payload.contentType;
  if (payload.contentName) custom.content_name = payload.contentName;
  if (payload.numItems != null) custom.num_items = payload.numItems;
  if (payload.orderId) custom.order_id = payload.orderId;
  return custom;
}

function shouldSendMetaCapi(settings: SiteSettings): boolean {
  const pixelId = settings.metaPixelId.trim();
  const token = settings.metaCapiToken.trim();
  if (!pixelId || !token) return false;
  return settings.metaCapiEnabled || Boolean(settings.metaCapiTestEventCode.trim());
}

export async function sendMetaCapiEvent(
  settings: SiteSettings,
  payload: PixelEventPayload,
): Promise<void> {
  if (!shouldSendMetaCapi(settings)) return;

  const body: Record<string, unknown> = {
    data: [
      {
        event_name: payload.eventName,
        event_time: Math.floor(Date.now() / 1000),
        event_id: payload.eventId,
        event_source_url: payload.eventSourceUrl || undefined,
        action_source: "website",
        user_data: buildUserData(payload),
        custom_data: buildCustomData(payload),
      },
    ],
  };

  const testCode = settings.metaCapiTestEventCode.trim();
  // A saved test code must not mark live CAPI traffic as test-only.
  if (!settings.metaCapiEnabled && testCode) body.test_event_code = testCode;

  const url = `https://graph.facebook.com/${META_GRAPH_VERSION}/${encodeURIComponent(settings.metaPixelId.trim())}/events`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ...body,
      access_token: settings.metaCapiToken.trim(),
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    console.error("[meta-capi]", response.status, text.slice(0, 500));
  }
}
