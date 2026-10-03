import type { Metadata } from "next";
import { BlockedIpsView } from "@/components/admin/orders/BlockedIpsView";

export const metadata: Metadata = {
  title: "Blocked IPs",
};

export const dynamic = "force-dynamic";

export default function BlockedIpsPage() {
  return <BlockedIpsView />;
}
