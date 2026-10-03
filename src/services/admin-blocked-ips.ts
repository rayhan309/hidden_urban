import { api } from "@/lib/axios";
import type { BlockedIp } from "@/types/blocked-ip";

export type { BlockedIp };

export async function fetchBlockedIps(): Promise<BlockedIp[]> {
  const { data } = await api.get<BlockedIp[]>("/api/admin/blocked-ips");
  return Array.isArray(data) ? data : [];
}

export async function blockCustomerIp(input: {
  ip: string;
  note?: string;
  orderNumber?: string;
  customerName?: string;
}): Promise<BlockedIp> {
  const { data } = await api.post<BlockedIp>("/api/admin/blocked-ips", input);
  return data;
}

export async function unblockCustomerIp(ip: string): Promise<void> {
  await api.delete("/api/admin/blocked-ips", { params: { ip } });
}
