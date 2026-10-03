import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth/get-session";
import { canAccessPath } from "@/lib/auth/permissions";
import { blockIp, listBlockedIps, unblockIp } from "@/lib/db/blocked-ips";

function forbidden() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

async function requireOrdersAccess() {
  const session = await getAdminSession();
  if (!session || !canAccessPath(session.role, "/dashboard/admin/orders")) {
    return null;
  }
  return session;
}

export async function GET() {
  try {
    if (!(await requireOrdersAccess())) return forbidden();
    const blockedIps = await listBlockedIps();
    return NextResponse.json(blockedIps, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load blocked IPs";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireOrdersAccess();
    if (!session) return forbidden();

    const body = (await request.json()) as {
      ip?: string;
      note?: string;
      orderNumber?: string;
      customerName?: string;
    };
    const blocked = await blockIp({
      ip: String(body.ip ?? ""),
      note: body.note,
      orderNumber: body.orderNumber,
      customerName: body.customerName,
      blockedBy: session.email,
    });
    return NextResponse.json(blocked, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to block IP";
    const status = message.includes("valid IP") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(request: Request) {
  try {
    if (!(await requireOrdersAccess())) return forbidden();
    const ip = new URL(request.url).searchParams.get("ip") ?? "";
    await unblockIp(ip);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to unblock IP";
    const status = message.includes("not found") || message.includes("required") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
