import type { CartItem } from "@/types/cart";
import type { AdminOrderStatus } from "@/types/admin-order";

export type StoreOrderCustomer = {
  name: string;
  phone: string;
  email: string;
  address: string;
  region: string;
  city: string;
  note: string;
  /** Selected shipping area label from site settings. */
  deliveryArea: string;
};

export type StoreOrderItem = CartItem & {
  /** Per-line discount amount (BDT), applied after price × qty. */
  discount?: number;
};

export type StoreOrder = {
  id: string;
  orderNumber: string;
  status: AdminOrderStatus;
  customer: StoreOrderCustomer;
  items: StoreOrderItem[];
  itemCount: number;
  itemsSummary: string;
  subtotal: number;
  shippingFee: number;
  /** Order-level discount amount (BDT). */
  discount: number;
  total: number;
  currency: "BDT";
  paymentMethod: "cod";
  createdAt: string;
  updatedAt: string;
  steadfastConsignmentId?: string | number | null;
  steadfastTrackingCode?: string;
  steadfastSentAt?: string;
  /** Visitor IP captured when the order was placed. Admin only. */
  customerIp?: string;
};

export type CreateStoreOrderInput = {
  customer: StoreOrderCustomer;
  items: StoreOrderItem[];
  shippingFee: number;
  deliveryAreaId?: string;
  tracking?: {
    eventId?: string;
    fbp?: string;
    fbc?: string;
    ttp?: string;
    ttclid?: string;
    eventSourceUrl?: string;
    clientUserAgent?: string;
  };
};
