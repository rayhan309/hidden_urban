import { isIP } from "node:net";
import { dbConnect } from "@/lib/dbConnect";
import { normalizeClientIp } from "@/lib/geo/client-ip";
import { getSeedModel } from "@/lib/seed/seed-model";
import type { BlockedIp } from "@/types/blocked-ip";

export type { BlockedIp };

export type BlockIpInput = {
  ip: string;
  note?: string;
  orderNumber?: string;
  customerName?: string;
  blockedBy?: string;
};

function mapBlockedIp(doc: Record<string, unknown>): BlockedIp {
  return {
    ip: String(doc.ip ?? ""),
    note: String(doc.note ?? ""),
    orderNumber: String(doc.orderNumber ?? ""),
    customerName: String(doc.customerName ?? ""),
    blockedAt: String(doc.blockedAt ?? doc.createdAt ?? ""),
    blockedBy: String(doc.blockedBy ?? ""),
  };
}

export function parseBlockableIp(value: string): string {
  const ip = normalizeClientIp(value);
  if (!ip || isIP(ip) === 0) {
    throw new Error("Enter a valid IP address");
  }
  return ip;
}

export async function listBlockedIps(): Promise<BlockedIp[]> {
  await dbConnect();
  const Model = getSeedModel("blocked_ips");
  const docs = await Model.find({}).sort({ blockedAt: -1 }).lean();
  return docs
    .map((doc) => mapBlockedIp(doc as unknown as Record<string, unknown>))
    .filter((row) => row.ip);
}

export async function isIpBlocked(ip: string): Promise<boolean> {
  const normalized = normalizeClientIp(ip);
  if (!normalized) return false;
  await dbConnect();
  const Model = getSeedModel("blocked_ips");
  const doc = await Model.findOne({ ip: normalized }).select({ _id: 1 }).lean();
  return Boolean(doc);
}

export async function blockIp(input: BlockIpInput): Promise<BlockedIp> {
  const ip = parseBlockableIp(input.ip);
  await dbConnect();
  const Model = getSeedModel("blocked_ips");
  const now = new Date().toISOString();
  const existing = await Model.findOne({ ip }).lean();
  if (existing) return mapBlockedIp(existing as unknown as Record<string, unknown>);

  const payload = {
    ip,
    note: (input.note ?? "").trim().slice(0, 200),
    orderNumber: (input.orderNumber ?? "").trim(),
    customerName: (input.customerName ?? "").trim(),
    blockedAt: now,
    blockedBy: (input.blockedBy ?? "").trim(),
  };
  await Model.create(payload as Record<string, unknown>);
  return payload;
}

export async function unblockIp(ip: string): Promise<void> {
  const normalized = normalizeClientIp(ip);
  if (!normalized) throw new Error("IP address is required");
  await dbConnect();
  const Model = getSeedModel("blocked_ips");
  const result = await Model.deleteOne({ ip: normalized });
  if (result.deletedCount < 1) throw new Error("Blocked IP not found");
}
