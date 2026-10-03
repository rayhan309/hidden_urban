import type { Metadata } from "next";
import { dehydrate } from "@tanstack/react-query";
import { QueryHydrationBoundary } from "@/components/query/QueryHydrationBoundary";
import { AdminLocationReportPageContent } from "@/components/admin/reports/AdminLocationReportPageContent";
import { getQueryClient } from "@/lib/queries/get-query-client";
import { queryKeys } from "@/lib/queries/query-keys";
import { getAdminOrders } from "@/services/admin-orders";

export const metadata: Metadata = {
  title: "Location report",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminLocationReportPage() {
  const queryClient = getQueryClient();

  await queryClient.prefetchQuery({
    queryKey: queryKeys.admin.orders(),
    queryFn: getAdminOrders,
  });

  return (
    <QueryHydrationBoundary state={dehydrate(queryClient)}>
      <AdminLocationReportPageContent />
    </QueryHydrationBoundary>
  );
}
