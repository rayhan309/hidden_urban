import { NextResponse } from "next/server";
import { createStoreOrderInDb } from "@/lib/db/order-mutations";
import { clientIpFromHeaders } from "@/lib/geo/client-ip";
import { orderAccessFromRequest } from "@/lib/geo/order-access";
import { dispatchCapiEvent } from "@/lib/pixel/dispatch";
import type { CreateStoreOrderInput } from "@/types/store-order";

function splitName(fullName: string): { firstName?: string; lastName?: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return {};
  if (parts.length === 1) return { firstName: parts[0] };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

export async function POST(request: Request) {
  try {
    const access = await orderAccessFromRequest(request);
    if (!access.allowed) {
      return NextResponse.json({ error: access.message }, { status: 403 });
    }

    const body = (await request.json()) as CreateStoreOrderInput;
    const customerIp = clientIpFromHeaders(request.headers) ?? "";
    const order = await createStoreOrderInDb(body, customerIp);

    const tracking = body.tracking;
    const eventId =
      tracking?.eventId?.trim() ||
      `purchase_${order.orderNumber}_${Date.now()}`;

    const { firstName, lastName } = splitName(order.customer.name);

    // Server-side Purchase CAPI (browser fires with same eventId after response).
    void dispatchCapiEvent({
      eventName: "Purchase",
      eventId,
      eventSourceUrl: tracking?.eventSourceUrl,
      value: order.total,
      currency: order.currency,
      contentIds: order.items
        .map((item) => String(item.productId || item.slug || "").trim())
        .filter(Boolean),
      contents: order.items
        .map((item) => ({
          id: String(item.productId || item.slug || "").trim(),
          quantity: item.quantity,
          item_price: item.price,
        }))
        .filter((item) => item.id.length > 0),
      contentType: "product",
      contentName: order.itemsSummary || undefined,
      numItems: order.itemCount,
      orderId: order.orderNumber,
      user: {
        email: order.customer.email || undefined,
        phone: order.customer.phone || undefined,
        firstName,
        lastName,
        city: order.customer.city || undefined,
        state: order.customer.region || undefined,
        country: "bd",
      },
      browser: {
        fbp: tracking?.fbp,
        fbc: tracking?.fbc,
        ttp: tracking?.ttp,
        ttclid: tracking?.ttclid,
        clientUserAgent:
          tracking?.clientUserAgent || request.headers.get("user-agent") || undefined,
        clientIpAddress: clientIpFromHeaders(request.headers),
      },
    });

    const { customerIp: _customerIp, ...publicOrder } = order;
    return NextResponse.json({ ...publicOrder, purchaseEventId: eventId }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to place order";
    const status = message.includes("required") || message.includes("empty") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
