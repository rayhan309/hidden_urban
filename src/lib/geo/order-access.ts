import { isIpBlocked } from "@/lib/db/blocked-ips";
import {
  BANGLADESH_ORDER_MESSAGE,
  IP_BLOCKED_ORDER_MESSAGE,
} from "@/lib/geo/bangladesh-order";
import { clientIpFromHeaders } from "@/lib/geo/client-ip";
import { canPlaceOrderFromHeaders } from "@/lib/geo/order-region";

export type OrderAccess = {
  allowed: boolean;
  message?: string;
};

export async function orderAccessFromRequest(request: Request): Promise<OrderAccess> {
  const ip = clientIpFromHeaders(request.headers);
  if (ip && (await isIpBlocked(ip))) {
    return { allowed: false, message: IP_BLOCKED_ORDER_MESSAGE };
  }

  if (!(await canPlaceOrderFromHeaders(request.headers))) {
    return { allowed: false, message: BANGLADESH_ORDER_MESSAGE };
  }

  return { allowed: true };
}
