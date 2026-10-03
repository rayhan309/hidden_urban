import { dbConnect } from "@/lib/dbConnect";
import { getSiteSettingsFromDbOrFallback } from "@/lib/db/readers/site-settings";
import { getSeedModel } from "@/lib/seed/seed-model";
import {
  assertSteadfastReady,
  resolveSteadfastConfig,
} from "@/lib/steadfast/config";
import {
  buildSteadfastAddress,
  normalizeSteadfastPhone,
  sanitizeSteadfastInvoice,
  steadfastCreateOrder,
  steadfastFraudCheck,
} from "@/lib/steadfast/client";
import {
  findShippingAreaIndex,
  resolveShippingFee,
} from "@/lib/shipping/calculate";
import type { AdminOrder, AdminOrderStatus } from "@/types/admin-order";
import { ADMIN_ORDER_STATUS_LABELS, ADMIN_ORDER_STATUSES } from "@/types/admin-order";
import type {
  CourierStats,
  OrderHistoryResponse,
  SiteOrderHistoryItem,
} from "@/types/order-history";
import type { CreateStoreOrderInput, StoreOrder } from "@/types/store-order";

function itemsSummary(items: CreateStoreOrderInput["items"]): string {
  return items.map((item) => item.name).slice(0, 3).join(", ");
}

function itemCount(items: CreateStoreOrderInput["items"]): number {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}

function lineNet(price: number, quantity: number, discount = 0): number {
  return Math.max(0, price * quantity - Math.max(0, discount));
}

function calcSubtotal(
  items: Array<{ price: number; quantity: number; discount?: number }>,
): number {
  return items.reduce(
    (sum, item) => sum + lineNet(item.price, item.quantity, item.discount ?? 0),
    0,
  );
}

function calcTotal(subtotal: number, shippingFee: number, discount = 0): number {
  return Math.max(0, subtotal + Math.max(0, shippingFee) - Math.max(0, discount));
}

function nextOrderNumber(): string {
  const stamp = Date.now().toString().slice(-6);
  const rand = Math.floor(Math.random() * 90 + 10);
  return `HU-${stamp}${rand}`;
}

export function mapStoreOrderDoc(doc: Record<string, unknown>): StoreOrder {
  const status = String(doc.status ?? "new_order");
  const customer = (doc.customer ?? {}) as Record<string, unknown>;
  const items = Array.isArray(doc.items) ? doc.items : [];

  return {
    id: String(doc.legacyId ?? doc.id ?? ""),
    orderNumber: String(doc.orderNumber ?? ""),
    status: ADMIN_ORDER_STATUSES.includes(status as AdminOrderStatus)
      ? (status as AdminOrderStatus)
      : "new_order",
    customer: {
      name: String(customer.name ?? ""),
      phone: String(customer.phone ?? doc.customerPhone ?? ""),
      email: String(customer.email ?? ""),
      address: String(customer.address ?? ""),
      region: String(customer.region ?? ""),
      city: String(customer.city ?? ""),
      note: String(customer.note ?? ""),
      deliveryArea: String(customer.deliveryArea ?? ""),
    },
    items: items.map((row) => {
      const item = (row ?? {}) as Record<string, unknown>;
      const compareAt = item.compareAtPrice;
      return {
        productId: String(item.productId ?? ""),
        slug: String(item.slug ?? ""),
        name: String(item.name ?? ""),
        price: Number(item.price ?? 0),
        compareAtPrice:
          compareAt === null || compareAt === undefined || compareAt === ""
            ? null
            : Number(compareAt),
        discount: Math.max(0, Number(item.discount ?? 0)),
        currency: item.currency === "USD" ? "USD" : "BDT",
        quantity: Number(item.quantity ?? 1),
        size: (String(item.size ?? "M") as StoreOrder["items"][number]["size"]),
        color: String(item.color ?? "Default"),
        image: String(item.image ?? ""),
      };
    }),
    itemCount: Number(doc.itemCount ?? 0),
    itemsSummary: String(doc.itemsSummary ?? ""),
    subtotal: Number(doc.subtotal ?? 0),
    shippingFee: Number(doc.shippingFee ?? 0),
    discount: Math.max(0, Number(doc.discount ?? 0)),
    total: Number(doc.total ?? 0),
    currency: "BDT",
    paymentMethod: "cod",
    createdAt: String(doc.createdAt ?? new Date().toISOString()),
    updatedAt: String(doc.updatedAt ?? new Date().toISOString()),
    steadfastConsignmentId: (() => {
      const value = doc.steadfastConsignmentId;
      if (value == null || value === "") return null;
      if (typeof value === "string" || typeof value === "number") return value;
      return String(value);
    })(),
    steadfastTrackingCode: String(doc.steadfastTrackingCode ?? ""),
    steadfastSentAt: doc.steadfastSentAt ? String(doc.steadfastSentAt) : undefined,
    customerIp: String(doc.customerIp ?? ""),
  };
}

export function toAdminOrder(order: StoreOrder): AdminOrder {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    customerName: order.customer.name,
    customerPhone: order.customer.phone,
    itemsSummary: order.itemsSummary,
    itemCount: order.itemCount,
    total: order.total,
    currency: "BDT",
    status: order.status,
    createdAt: order.createdAt,
    steadfastConsignmentId: order.steadfastConsignmentId ?? null,
    customerIp: order.customerIp?.trim() ?? "",
    customerCity: order.customer.city?.trim() ?? "",
    customerRegion: order.customer.region?.trim() ?? "",
    customerAddress: order.customer.address?.trim() ?? "",
  };
}

export async function createStoreOrderInDb(
  input: CreateStoreOrderInput,
  customerIp = "",
): Promise<StoreOrder> {
  if (!input.items.length) {
    throw new Error("Cart is empty");
  }
  if (!input.customer.name.trim() || !input.customer.phone.trim()) {
    throw new Error("Name and phone are required");
  }
  if (!input.customer.address.trim() || !input.customer.city.trim()) {
    throw new Error("Delivery address is required");
  }

  await dbConnect();
  const settings = await getSiteSettingsFromDbOrFallback();
  const areaIndex = findShippingAreaIndex(
    settings,
    input.deliveryAreaId || input.customer.deliveryArea || "",
  );
  const selectedArea = settings.shippingAreas[areaIndex];

  const Model = getSeedModel("orders");
  const now = new Date().toISOString();
  const legacyId = `ord-${Date.now()}`;
  const subtotal = calcSubtotal(input.items);
  const shippingFee = resolveShippingFee(settings, areaIndex, subtotal);
  const discount = 0;
  const total = calcTotal(subtotal, shippingFee, discount);
  const count = itemCount(input.items);
  const summary = itemsSummary(input.items);

  const payload = {
    legacyId,
    orderNumber: nextOrderNumber(),
    status: "new_order" as const,
    customer: {
      name: input.customer.name.trim(),
      phone: input.customer.phone.trim(),
      email: input.customer.email.trim(),
      address: input.customer.address.trim(),
      region: input.customer.region.trim(),
      city: input.customer.city.trim(),
      note: input.customer.note.trim(),
      deliveryArea: (
        input.customer.deliveryArea ||
        selectedArea?.name ||
        ""
      ).trim(),
    },
    items: input.items.map((item) => ({
      ...item,
      discount: Math.max(0, Number(item.discount ?? 0)),
    })),
    itemCount: count,
    itemsSummary: summary,
    subtotal,
    shippingFee,
    discount,
    total,
    currency: "BDT" as const,
    paymentMethod: "cod" as const,
    customerIp: customerIp.trim(),
    createdAt: now,
    updatedAt: now,
  };

  await Model.create(payload as Record<string, unknown>);

  // Keep customer rollup fresh for admin customers list.
  const Customers = getSeedModel("customers");
  const existing = await Customers.findOne({ phone: payload.customer.phone }).lean();
  if (existing) {
    const doc = existing as unknown as Record<string, unknown>;
    await Customers.updateOne(
      { phone: payload.customer.phone },
      {
        $set: {
          name: payload.customer.name,
          address: `${payload.customer.address}, ${payload.customer.city}`,
          lastOrderAt: now,
          orderCount: Number(doc.orderCount ?? 0) + 1,
          totalSpent: Number(doc.totalSpent ?? 0) + total,
        },
      },
    );
  } else {
    await Customers.updateOne(
      { phone: payload.customer.phone },
      {
        $set: {
          legacyId: `cus-${Date.now()}`,
          name: payload.customer.name,
          phone: payload.customer.phone,
          address: `${payload.customer.address}, ${payload.customer.city}`,
          orderCount: 1,
          totalSpent: total,
          lastOrderAt: now,
        },
      },
      { upsert: true },
    );
  }

  return mapStoreOrderDoc(payload);
}

export async function readStoreOrdersFromDb(): Promise<StoreOrder[]> {
  await dbConnect();
  const Model = getSeedModel("orders");
  const docs = await Model.find({}).sort({ createdAt: -1 }).lean();
  return docs.map((doc) => mapStoreOrderDoc(doc as unknown as Record<string, unknown>));
}

export async function getStoreOrderByNumber(
  orderNumber: string,
): Promise<StoreOrder | null> {
  const normalized = orderNumber.trim().toUpperCase();
  if (!normalized) return null;

  await dbConnect();
  const Model = getSeedModel("orders");
  const doc = await Model.findOne({
    orderNumber: { $regex: new RegExp(`^${normalized.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
  }).lean();

  if (!doc) return null;
  return mapStoreOrderDoc(doc as unknown as Record<string, unknown>);
}

export async function getStoreOrderByNumberAndPhone(
  orderNumber: string,
  phone: string,
): Promise<StoreOrder | null> {
  const order = await getStoreOrderByNumber(orderNumber);
  if (!order) return null;

  const normalizePhone = (value: string) => value.replace(/\D/g, "").replace(/^880/, "0");
  if (normalizePhone(order.customer.phone) !== normalizePhone(phone)) {
    return null;
  }
  return order;
}

function mapLegacyAdminOrderToStoreOrder(doc: Record<string, unknown>): StoreOrder {
  const status = String(doc.status ?? "new_order");
  const createdAt = String(doc.createdAt ?? new Date().toISOString());
  const total = Number(doc.total ?? 0);
  return {
    id: String(doc.legacyId ?? doc.id ?? ""),
    orderNumber: String(doc.orderNumber ?? ""),
    status: ADMIN_ORDER_STATUSES.includes(status as AdminOrderStatus)
      ? (status as AdminOrderStatus)
      : "new_order",
    customer: {
      name: String(doc.customerName ?? ""),
      phone: String(doc.customerPhone ?? ""),
      email: String(doc.customerEmail ?? ""),
      address: String(doc.customerAddress ?? ""),
      region: String(doc.customerRegion ?? ""),
      city: String(doc.customerCity ?? ""),
      note: String(doc.note ?? doc.customerNote ?? ""),
      deliveryArea: String(doc.deliveryArea ?? ""),
    },
    items: [],
    itemCount: Number(doc.itemCount ?? 0),
    itemsSummary: String(doc.itemsSummary ?? ""),
    subtotal: Number(doc.subtotal ?? total),
    shippingFee: Number(doc.shippingFee ?? 0),
    discount: Math.max(0, Number(doc.discount ?? 0)),
    total,
    currency: "BDT",
    paymentMethod: "cod",
    createdAt,
    updatedAt: String(doc.updatedAt ?? createdAt),
    customerIp: String(doc.customerIp ?? ""),
  };
}

export type UpdateAdminOrderInput = {
  status: AdminOrderStatus;
  deliveryAreaId?: string;
  items: StoreOrder["items"];
  shippingFee: number;
  discount: number;
  customer: {
    name: string;
    phone: string;
    email: string;
    address: string;
    region: string;
    city: string;
    note: string;
    deliveryArea?: string;
  };
};

export async function getAdminOrderById(id: string): Promise<StoreOrder | null> {
  const normalized = id.trim();
  if (!normalized) return null;

  await dbConnect();

  const Orders = getSeedModel("orders");
  const storeDoc = await Orders.findOne({ legacyId: normalized }).lean();
  if (storeDoc) {
    return mapStoreOrderDoc(storeDoc as unknown as Record<string, unknown>);
  }

  const Legacy = getSeedModel("admin_orders");
  const legacyDoc = await Legacy.findOne({ legacyId: normalized }).lean();
  if (legacyDoc) {
    return mapLegacyAdminOrderToStoreOrder(legacyDoc as unknown as Record<string, unknown>);
  }

  return null;
}

export async function updateAdminOrderInDb(
  id: string,
  input: UpdateAdminOrderInput,
): Promise<StoreOrder> {
  const normalized = id.trim();
  if (!normalized) throw new Error("Order not found");

  await dbConnect();
  const now = new Date().toISOString();
  const existing = await getAdminOrderById(normalized);
  const settings = await getSiteSettingsFromDbOrFallback();
  const matchedArea = input.deliveryAreaId
    ? settings.shippingAreas.find((area) => area.id === input.deliveryAreaId)
    : undefined;

  const customer = {
    name: input.customer.name.trim(),
    phone: input.customer.phone.trim(),
    email: input.customer.email.trim(),
    address: input.customer.address.trim(),
    region: input.customer.region.trim(),
    city: input.customer.city.trim(),
    note: input.customer.note.trim(),
    deliveryArea: (
      matchedArea?.name ??
      input.customer.deliveryArea ??
      existing?.customer.deliveryArea ??
      ""
    ).trim(),
  };

  if (!customer.name || !customer.phone) {
    throw new Error("Name and phone are required");
  }
  if (!input.items.length) {
    throw new Error("Add at least one product");
  }

  const items = input.items.map((item) => ({
    productId: item.productId,
    slug: item.slug,
    name: item.name.trim(),
    price: Math.max(0, Number(item.price) || 0),
    compareAtPrice: item.compareAtPrice ?? null,
    discount: Math.max(0, Number(item.discount) || 0),
    currency: item.currency === "USD" ? ("USD" as const) : ("BDT" as const),
    quantity: Math.max(1, Math.floor(Number(item.quantity) || 1)),
    size: (item.size || "M") as StoreOrder["items"][number]["size"],
    color: item.color || "Default",
    image: item.image || "",
  }));
  const subtotal = calcSubtotal(items);
  const shippingFee = Math.max(0, Number(input.shippingFee) || 0);
  const discount = Math.max(0, Number(input.discount) || 0);
  const total = calcTotal(subtotal, shippingFee, discount);
  const count = itemCount(items);
  const summary = itemsSummary(items);

  const Orders = getSeedModel("orders");
  const storeUpdated = await Orders.findOneAndUpdate(
    { legacyId: normalized },
    {
      $set: {
        status: input.status,
        customer,
        items,
        subtotal,
        shippingFee,
        discount,
        total,
        itemCount: count,
        itemsSummary: summary,
        updatedAt: now,
      },
    },
    { new: true },
  ).lean();

  if (storeUpdated) {
    return mapStoreOrderDoc(storeUpdated as unknown as Record<string, unknown>);
  }

  const Legacy = getSeedModel("admin_orders");
  const legacyUpdated = await Legacy.findOneAndUpdate(
    { legacyId: normalized },
    {
      $set: {
        status: input.status,
        customerName: customer.name,
        customerPhone: customer.phone,
        customerEmail: customer.email,
        customerAddress: customer.address,
        customerRegion: customer.region,
        customerCity: customer.city,
        note: customer.note,
        deliveryArea: customer.deliveryArea,
        items,
        itemCount: count,
        itemsSummary: summary,
        subtotal,
        shippingFee,
        discount,
        total,
        updatedAt: now,
      },
    },
    { new: true },
  ).lean();

  if (legacyUpdated) {
    return mapLegacyAdminOrderToStoreOrder(
      legacyUpdated as unknown as Record<string, unknown>,
    );
  }

  throw new Error("Order not found");
}

export async function deleteAdminOrderInDb(id: string): Promise<void> {
  const normalized = id.trim();
  if (!normalized) throw new Error("Order not found");

  await dbConnect();

  const Orders = getSeedModel("orders");
  const storeResult = await Orders.deleteOne({ legacyId: normalized });
  if (storeResult.deletedCount > 0) return;

  const Legacy = getSeedModel("admin_orders");
  const legacyResult = await Legacy.deleteOne({ legacyId: normalized });
  if (legacyResult.deletedCount > 0) return;

  throw new Error("Order not found");
}

export type SendOrderToSteadfastResult = {
  order: StoreOrder;
  consignmentId: string | number;
  trackingCode: string;
};

export async function sendOrderToSteadfastInDb(
  id: string,
): Promise<SendOrderToSteadfastResult> {
  const normalized = id.trim();
  if (!normalized) throw new Error("Order not found");

  const order = await getAdminOrderById(normalized);
  if (!order) throw new Error("Order not found");

  const settings = await getSiteSettingsFromDbOrFallback();
  const steadfast = resolveSteadfastConfig(settings);
  assertSteadfastReady(steadfast);

  await dbConnect();
  const Orders = getSeedModel("orders");
  const existingDoc = await Orders.findOne({ legacyId: normalized }).lean();
  const existingRecord = (existingDoc ?? {}) as Record<string, unknown>;

  if (existingRecord.steadfastConsignmentId) {
    throw new Error("This order was already sent to Steadfast.");
  }

  const recipientPhone = normalizeSteadfastPhone(order.customer.phone);
  if (recipientPhone.length !== 11 || !recipientPhone.startsWith("0")) {
    throw new Error("Customer phone must be a valid 11-digit Bangladesh number.");
  }

  const recipientAddress = buildSteadfastAddress([
    order.customer.address,
    order.customer.city,
    order.customer.region,
    order.customer.deliveryArea,
  ]);

  if (!recipientAddress.trim()) {
    throw new Error("Customer delivery address is required before sending to courier.");
  }

  const steadfastResult = await steadfastCreateOrder(
    {
      baseUrl: steadfast.baseUrl,
      apiKey: steadfast.apiKey,
      secretKey: steadfast.secretKey,
    },
    {
      invoice: sanitizeSteadfastInvoice(order.orderNumber),
      recipient_name: order.customer.name.trim().slice(0, 100),
      recipient_phone: recipientPhone,
      recipient_address: recipientAddress,
      cod_amount: Math.max(0, Math.round(order.total)),
      note: order.customer.note.trim() || undefined,
      recipient_email: order.customer.email.trim() || undefined,
      item_description: order.itemsSummary.slice(0, 250) || undefined,
      total_lot: order.itemCount > 0 ? order.itemCount : undefined,
      delivery_type: 0,
    },
  );

  const now = new Date().toISOString();
  const updatePayload = {
    status: "entered_steadfast" as const,
    steadfastConsignmentId: steadfastResult.consignmentId,
    steadfastTrackingCode: steadfastResult.trackingCode,
    steadfastInvoice: steadfastResult.invoice,
    steadfastSentAt: now,
    updatedAt: now,
  };

  const storeUpdated = await Orders.findOneAndUpdate(
    { legacyId: normalized },
    { $set: updatePayload },
    { new: true },
  ).lean();

  if (storeUpdated) {
    return {
      order: mapStoreOrderDoc(storeUpdated as unknown as Record<string, unknown>),
      consignmentId: steadfastResult.consignmentId,
      trackingCode: steadfastResult.trackingCode,
    };
  }

  throw new Error("Only storefront orders can be sent to Steadfast.");
}

function normalizeOrderPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("880") && digits.length >= 13) {
    return `0${digits.slice(3, 13)}`;
  }
  if (digits.startsWith("88") && digits.length >= 12) {
    return `0${digits.slice(2, 12)}`;
  }
  if (digits.length === 10) {
    return `0${digits}`;
  }
  return digits.slice(0, 11);
}

function phoneLookupVariants(phone: string) {
  const normalized = normalizeOrderPhone(phone);
  const digits = normalized.replace(/\D/g, "");
  const withoutLeadingZero = digits.startsWith("0") ? digits.slice(1) : digits;
  return [...new Set([phone.trim(), normalized, digits, `88${withoutLeadingZero}`, `880${withoutLeadingZero}`])].filter(
    Boolean,
  );
}

async function findSiteOrdersByPhone(
  phone: string,
  currentOrderId: string,
): Promise<SiteOrderHistoryItem[]> {
  const variants = phoneLookupVariants(phone);
  if (variants.length === 0) return [];

  const Orders = getSeedModel("orders");
  const docs = await Orders.find({
    $or: [
      { customerPhone: { $in: variants } },
      { "customer.phone": { $in: variants } },
    ],
  })
    .sort({ createdAt: -1 })
    .limit(30)
    .lean();

  const targetPhone = normalizeOrderPhone(phone);
  return docs
    .map((doc) => mapStoreOrderDoc(doc as unknown as Record<string, unknown>))
    .filter((row) => normalizeOrderPhone(row.customer.phone) === targetPhone)
    .map((row) => buildSiteOrderHistoryItem(row, currentOrderId));
}

function buildShipmentNote(order: StoreOrder): string {
  if (order.steadfastConsignmentId != null && order.steadfastConsignmentId !== "") {
    const tracking = order.steadfastTrackingCode?.trim();
    return tracking
      ? `Steadfast consignment #${order.steadfastConsignmentId} · Tracking ${tracking}`
      : `Steadfast consignment #${order.steadfastConsignmentId}`;
  }
  return "No courier shipment for this order yet.";
}

function buildSiteOrderHistoryItem(
  order: StoreOrder,
  currentOrderId: string,
): SiteOrderHistoryItem {
  const itemNames = order.items.map((item) => item.name).slice(0, 2).join(", ");
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    isCurrent: order.id === currentOrderId,
    status: order.status,
    statusLabel: ADMIN_ORDER_STATUS_LABELS[order.status],
    itemsSummary: order.itemsSummary || itemNames || "Order items",
    subtotal: order.subtotal,
    shippingFee: order.shippingFee,
    total: order.total,
    address: [order.customer.address, order.customer.city, order.customer.region]
      .filter(Boolean)
      .join(", "),
    createdAt: order.createdAt,
    steadfastConsignmentId: order.steadfastConsignmentId ?? null,
    shipmentNote: buildShipmentNote(order),
  };
}

const PATHAO_NOT_CONFIGURED: CourierStats = {
  available: false,
  successRate: 0,
  total: 0,
  delivered: 0,
  cancelled: 0,
  rating: "Not connected",
  risk: "unknown",
  error: "Pathao API is not configured on this store.",
};

export async function getAdminOrderHistoryInDb(id: string) {
  const normalized = id.trim();
  if (!normalized) throw new Error("Order not found");

  const order = await getAdminOrderById(normalized);
  if (!order) throw new Error("Order not found");

  await dbConnect();
  const siteOrders = await findSiteOrdersByPhone(order.customer.phone, order.id);
  const siteOrderCount = siteOrders.length;
  const siteShipmentCount = siteOrders.filter(
    (row) => row.steadfastConsignmentId != null && row.steadfastConsignmentId !== "",
  ).length;

  const settings = await getSiteSettingsFromDbOrFallback();
  const shopLabel = settings.shopName?.trim() || "Hidden Urban";

  let steadfastStats: CourierStats = {
    available: false,
    successRate: 0,
    total: 0,
    delivered: 0,
    cancelled: 0,
    rating: "Unavailable",
    risk: "unknown",
    error: "Steadfast is not configured.",
  };

  try {
    const steadfast = resolveSteadfastConfig(settings);
    assertSteadfastReady(steadfast);
    const fraud = await steadfastFraudCheck(
      {
        baseUrl: steadfast.baseUrl,
        apiKey: steadfast.apiKey,
        secretKey: steadfast.secretKey,
      },
      order.customer.phone,
    );
    steadfastStats = {
      available: true,
      successRate: fraud.successRate,
      total: fraud.total,
      delivered: fraud.delivered,
      cancelled: fraud.cancelled,
      rating: fraud.rating,
      risk: fraud.risk,
    };
  } catch (error) {
    steadfastStats.error =
      error instanceof Error ? error.message : "Could not load Steadfast customer history";
  }

  return {
    customerName: order.customer.name,
    customerPhone: order.customer.phone,
    shopLabel,
    siteOrderCount,
    siteShipmentCount,
    pathaoStats: PATHAO_NOT_CONFIGURED,
    steadfastStats,
    siteOrders,
  } satisfies OrderHistoryResponse;
}
