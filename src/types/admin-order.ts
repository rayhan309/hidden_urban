export type AdminOrderStatus =
  | "new_order"
  | "order_confirmed"
  | "entered_steadfast"
  | "no_response"
  | "will_inform_later"
  | "follow_up_needed"
  | "out_for_delivery"
  | "scammer_fraudulent"
  | "delivered"
  | "cancelled";

export type AdminOrder = {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  itemsSummary: string;
  itemCount: number;
  total: number;
  currency: "BDT";
  status: AdminOrderStatus;
  createdAt: string;
  steadfastConsignmentId?: string | number | null;
  customerIp?: string;
  customerCity?: string;
  customerRegion?: string;
  customerAddress?: string;
};

export const ADMIN_ORDER_STATUS_LABELS: Record<AdminOrderStatus, string> = {
  new_order: "New order",
  order_confirmed: "Order confirmed",
  entered_steadfast: "Entered in Steadfast",
  no_response: "No response",
  will_inform_later: "Will inform later",
  follow_up_needed: "Follow-up needed",
  out_for_delivery: "Out for delivery",
  scammer_fraudulent: "Scammer / fraudulent",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export const ADMIN_ORDER_STATUS_FILTERS: { id: "all" | AdminOrderStatus; label: string }[] = [
  { id: "all", label: "All" },
  { id: "new_order", label: "New order" },
  { id: "order_confirmed", label: "Order confirmed" },
  { id: "entered_steadfast", label: "Entered in Steadfast" },
  { id: "no_response", label: "No response" },
  { id: "will_inform_later", label: "Will inform later" },
  { id: "follow_up_needed", label: "Follow-up needed" },
  { id: "out_for_delivery", label: "Out for delivery" },
  { id: "scammer_fraudulent", label: "Scammer / fraudulent" },
];

export const ADMIN_ORDER_STATUSES: AdminOrderStatus[] = [
  "new_order",
  "order_confirmed",
  "entered_steadfast",
  "no_response",
  "will_inform_later",
  "follow_up_needed",
  "out_for_delivery",
  "scammer_fraudulent",
  "delivered",
  "cancelled",
];
