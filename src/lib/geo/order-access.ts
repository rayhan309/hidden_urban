import { isIpBlocked } from "@/lib/db/blocked-ips";
import { clientIpFromHeaders } from "@/lib/geo/client-ip";

const IP_BLOCKED_ORDER_MESSAGE = "Orders from this IP address are blocked.";

export type OrderAccess = {
  allowed: boolean;
  message?: string;
};

export async function orderAccessFromRequest(request: Request): Promise<OrderAccess> {
  const ip = clientIpFromHeaders(request.headers);
  if (ip && (await isIpBlocked(ip))) {
    return { allowed: false, message: IP_BLOCKED_ORDER_MESSAGE };
  }

  return { allowed: true };
}
