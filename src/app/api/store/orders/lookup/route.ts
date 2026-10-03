import { NextResponse } from "next/server";
import {
  getStoreOrderByNumber,
  getStoreOrderByNumberAndPhone,
} from "@/lib/db/order-mutations";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const orderNumber = searchParams.get("orderNumber")?.trim() ?? "";
    const phone = searchParams.get("phone")?.trim() ?? "";

    if (!orderNumber) {
      return NextResponse.json({ error: "Order number is required" }, { status: 400 });
    }

    const order = phone
      ? await getStoreOrderByNumberAndPhone(orderNumber, phone)
      : await getStoreOrderByNumber(orderNumber);

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const { customerIp: _customerIp, ...publicOrder } = order;
    return NextResponse.json(publicOrder);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load order";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
