import { normalizePixelContents } from "@/lib/pixel/contents";
import type { PixelContentItem, PixelEventName } from "@/lib/pixel/types";

/** Names TikTok Events Manager counts for the commerce funnel. */
export const TIKTOK_EVENT_NAME: Record<PixelEventName, string> = {
  PageView: "Pageview",
  ViewContent: "ViewContent",
  AddToCart: "AddToCart",
  InitiateCheckout: "InitiateCheckout",
  Purchase: "Purchase",
};

type TikTokPropertyInput = {
  eventName: PixelEventName;
  value?: number;
  currency?: string;
  contentIds?: string[];
  contents?: PixelContentItem[];
  contentType?: string;
  contentName?: string;
  numItems?: number;
  orderId?: string;
};

function commerceContentType(contentType?: string) {
  return contentType === "product_group" ? "product_group" : "product";
}

/**
 * Properties TikTok's pixel and Events API accept for funnel events.
 * PageView stays empty so a product content_type without content_id is not rejected.
 */
export function buildTikTokProperties(input: TikTokPropertyInput): Record<string, unknown> {
  const properties: Record<string, unknown> = {};
  const commerce = input.eventName !== "PageView";
  const contents = normalizePixelContents(input.contents, input.contentIds);
  const contentType = commerce ? commerceContentType(input.contentType) : undefined;

  if (contentType) properties.content_type = contentType;

  const currency = input.currency?.trim().toUpperCase();
  if (currency) properties.currency = currency;

  if (input.value != null && Number.isFinite(input.value)) {
    properties.value = input.value;
  }

  const description = input.contentName?.trim();
  if (description) {
    properties.description = description;
    properties.content_name = description;
  }
  if (input.orderId?.trim()) properties.order_id = input.orderId.trim();

  if (contents.length) {
    properties.contents = contents.map((item) => {
      const row: Record<string, unknown> = {
        content_id: item.id,
        quantity: item.quantity,
        price: item.item_price,
      };
      if (contentType) row.content_type = contentType;
      if (description) row.content_name = description;
      return row;
    });
    properties.content_ids = contents.map((item) => item.id);
    if (contents.length === 1) properties.content_id = contents[0].id;
    properties.quantity =
      input.numItems ?? contents.reduce((sum, item) => sum + item.quantity, 0);
  } else if (commerce && input.numItems != null) {
    properties.quantity = input.numItems;
  }

  return properties;
}
