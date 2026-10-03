import { NextResponse } from "next/server";
import { orderAccessFromRequest } from "@/lib/geo/order-access";

export async function GET(request: Request) {
  const access = await orderAccessFromRequest(request);
  return NextResponse.json(access, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
