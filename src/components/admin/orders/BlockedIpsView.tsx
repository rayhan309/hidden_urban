"use client";

import BlockOutlinedIcon from "@mui/icons-material/BlockOutlined";
import {
  Box,
  Button,
  CircularProgress,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { useToast } from "@/context/toast/ToastProvider";
import { ADMIN_ACCENT } from "@/lib/constants/admin";
import { queryKeys } from "@/lib/queries/query-keys";
import { blockCustomerIp, fetchBlockedIps, unblockCustomerIp } from "@/services/admin-blocked-ips";

function formatBlockedAt(iso: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function BlockedIpsView() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [ip, setIp] = useState("");
  const [note, setNote] = useState("");
  const { data, isPending, isError, error } = useQuery({
    queryKey: queryKeys.admin.blockedIps(),
    queryFn: fetchBlockedIps,
  });

  const blockMutation = useMutation({
    mutationFn: () => blockCustomerIp({ ip, note }),
    onSuccess: async () => {
      setIp("");
      setNote("");
      showToast("IP blocked");
      await queryClient.invalidateQueries({ queryKey: queryKeys.admin.blockedIps() });
    },
    onError: (err) => {
      showToast(err instanceof Error ? err.message : "Failed to block IP", "error");
    },
  });

  const unblockMutation = useMutation({
    mutationFn: unblockCustomerIp,
    onSuccess: async () => {
      showToast("IP unblocked");
      await queryClient.invalidateQueries({ queryKey: queryKeys.admin.blockedIps() });
    },
    onError: (err) => {
      showToast(err instanceof Error ? err.message : "Failed to unblock IP", "error");
    },
  });

  return (
    <Box sx={{ width: "100%", minWidth: 0 }}>
      <Box sx={{ mb: 2.5 }}>
        <Typography
          sx={{
            fontSize: "0.7rem",
            fontWeight: 700,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: ADMIN_ACCENT,
          }}
        >
          Fulfillment
        </Typography>
        <Typography sx={{ mt: 0.5, fontSize: { xs: "1.35rem", sm: "1.5rem" }, fontWeight: 700 }}>
          Blocked IPs
        </Typography>
        <Typography sx={{ mt: 0.5, fontSize: "0.9rem", color: "text.secondary" }}>
          IP addresses saved on orders. A blocked IP cannot place a new order.
        </Typography>
        <Button component={Link} href="/dashboard/admin/orders" sx={{ mt: 1, textTransform: "none", px: 0 }}>
          Back to orders
        </Button>
      </Box>

      <Box
        component="form"
        onSubmit={(event) => {
          event.preventDefault();
          if (!ip.trim()) return;
          blockMutation.mutate();
        }}
        sx={{
          display: "flex",
          flexWrap: "wrap",
          gap: 1.25,
          mb: 3,
          p: 2,
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 1,
          bgcolor: "background.paper",
        }}
      >
        <TextField
          label="IP address"
          size="small"
          value={ip}
          onChange={(event) => setIp(event.target.value)}
          sx={{ minWidth: 220 }}
        />
        <TextField
          label="Note (optional)"
          size="small"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          sx={{ minWidth: 240, flex: 1 }}
        />
        <Button
          type="submit"
          variant="contained"
          startIcon={<BlockOutlinedIcon />}
          disabled={blockMutation.isPending || !ip.trim()}
          sx={{ textTransform: "none", bgcolor: "#b91c1c", height: 40 }}
        >
          {blockMutation.isPending ? "Blocking…" : "Block IP"}
        </Button>
      </Box>

      {isPending ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress size={28} />
        </Box>
      ) : isError ? (
        <Typography color="error">
          {error instanceof Error ? error.message : "Failed to load blocked IPs"}
        </Typography>
      ) : !data?.length ? (
        <Typography color="text.secondary">No blocked IP addresses yet.</Typography>
      ) : (
        <TableContainer sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                {["IP", "Customer", "Order", "Note", "Blocked", ""].map((heading) => (
                  <TableCell key={heading || "action"} sx={{ fontWeight: 700, bgcolor: "#f8fafc" }}>
                    {heading}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {data.map((row) => (
                <TableRow key={row.ip} hover>
                  <TableCell sx={{ fontFamily: "ui-monospace, monospace", fontWeight: 700 }}>
                    {row.ip}
                  </TableCell>
                  <TableCell>{row.customerName || "—"}</TableCell>
                  <TableCell>{row.orderNumber ? `#${row.orderNumber}` : "—"}</TableCell>
                  <TableCell>{row.note || "—"}</TableCell>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>
                    <Stack spacing={0.25}>
                      <span>{formatBlockedAt(row.blockedAt)}</span>
                      {row.blockedBy ? (
                        <Typography component="span" sx={{ fontSize: "0.75rem", color: "text.secondary" }}>
                          {row.blockedBy}
                        </Typography>
                      ) : null}
                    </Stack>
                  </TableCell>
                  <TableCell align="right">
                    <Button
                      size="small"
                      onClick={() => unblockMutation.mutate(row.ip)}
                      disabled={unblockMutation.isPending}
                      sx={{ textTransform: "none" }}
                    >
                      Unblock
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
