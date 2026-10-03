"use client";

import { Box, CircularProgress } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { AdminLocationReportView } from "@/components/admin/reports/AdminLocationReportView";
import { queryKeys } from "@/lib/queries/query-keys";
import { fetchAdminOrders } from "@/services/store-queries";

export function AdminLocationReportPageContent() {
  const { data, isPending, isError } = useQuery({
    queryKey: queryKeys.admin.orders(),
    queryFn: fetchAdminOrders,
  });

  if (isPending) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 10 }}>
        <CircularProgress size={32} />
      </Box>
    );
  }

  if (isError || !data) return null;

  return <AdminLocationReportView orders={data} />;
}
