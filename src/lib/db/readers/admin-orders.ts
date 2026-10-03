import { dbConnect } from "@/lib/dbConnect";
import { getSeedModel } from "@/lib/seed/seed-model";
import { readStoreOrdersFromDb, toAdminOrder } from "@/lib/db/order-mutations";
import type { AdminOrder, AdminOrderStatus } from "@/types/admin-order";
import { ADMIN_ORDER_STATUSES } from "@/types/admin-order";

function mapLegacyAdminOrderDoc(doc: Record<string, unknown>): AdminOrder {
  const status = String(doc.status ?? "new_order");
  return {
    id: String(doc.legacyId ?? doc.id ?? ""),
    orderNumber: String(doc.orderNumber ?? ""),
    customerName: String(doc.customerName ?? ""),
    customerPhone: String(doc.customerPhone ?? ""),
    itemsSummary: String(doc.itemsSummary ?? ""),
    itemCount: Number(doc.itemCount ?? 0),
    total: Number(doc.total ?? 0),
    currency: "BDT",
    status: ADMIN_ORDER_STATUSES.includes(status as AdminOrderStatus)
      ? (status as AdminOrderStatus)
      : "new_order",
    createdAt: String(doc.createdAt ?? new Date().toISOString()),
    customerCity: String(doc.customerCity ?? ""),
    customerRegion: String(doc.customerRegion ?? ""),
    customerAddress: String(doc.customerAddress ?? ""),
  };
}

async function readLegacyAdminOrdersFromDb(): Promise<AdminOrder[]> {
  await dbConnect();
  const Model = getSeedModel("admin_orders");
  const docs = await Model.find({}).sort({ createdAt: -1 }).lean();
  return docs.map((doc) => mapLegacyAdminOrderDoc(doc as unknown as Record<string, unknown>));
}

/** Prefer live storefront `orders`; merge any legacy admin_orders by orderNumber. */
export async function getAdminOrdersFromDbOrFallback(): Promise<AdminOrder[]> {
  try {
    const [storeOrders, legacy] = await Promise.all([
      readStoreOrdersFromDb(),
      readLegacyAdminOrdersFromDb(),
    ]);

    const byNumber = new Map<string, AdminOrder>();
    for (const order of legacy) {
      if (order.orderNumber) byNumber.set(order.orderNumber, order);
    }
    for (const order of storeOrders.map(toAdminOrder)) {
      byNumber.set(order.orderNumber, order);
    }

    return Array.from(byNumber.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  } catch (error) {
    console.error("[db] orders read failed:", error);
    return [];
  }
}
