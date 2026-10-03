"use client";

import BlockOutlinedIcon from "@mui/icons-material/BlockOutlined";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import HistoryOutlinedIcon from "@mui/icons-material/HistoryOutlined";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AdminOrderHistoryDialog } from "@/components/admin/orders/AdminOrderHistoryDialog";
import { useToast } from "@/context/toast/ToastProvider";
import { ADMIN_ACCENT } from "@/lib/constants/admin";
import { formatCurrency } from "@/lib/formatters/currency";
import { queryKeys } from "@/lib/queries/query-keys";
import { blockCustomerIp, fetchBlockedIps, unblockCustomerIp } from "@/services/admin-blocked-ips";
import { fetchAdminOrderDetail } from "@/services/admin-order-mutations";
import {
  ADMIN_ORDER_STATUS_LABELS,
  type AdminOrderStatus,
} from "@/types/admin-order";

const statusChipSx: Record<
  AdminOrderStatus,
  { bgcolor: string; color: string; border: string }
> = {
  new_order: { bgcolor: "#ecfdf5", color: "#047857", border: "#a7f3d0" },
  order_confirmed: { bgcolor: "#eff6ff", color: "#1d4ed8", border: "#bfdbfe" },
  entered_steadfast: { bgcolor: "#f0fdf4", color: "#15803d", border: "#bbf7d0" },
  no_response: { bgcolor: "#f8fafc", color: "#475569", border: "#e2e8f0" },
  will_inform_later: { bgcolor: "#fffbeb", color: "#b45309", border: "#fde68a" },
  follow_up_needed: { bgcolor: "#fef3c7", color: "#92400e", border: "#fcd34d" },
  out_for_delivery: { bgcolor: "#ecfeff", color: "#0e7490", border: "#a5f3fc" },
  scammer_fraudulent: { bgcolor: "#fef2f2", color: "#b91c1c", border: "#fecaca" },
  delivered: { bgcolor: "#f1f5f9", color: "#334155", border: "#e2e8f0" },
  cancelled: { bgcolor: "#fef2f2", color: "#991b1b", border: "#fecaca" },
};

type AdminOrderDetailDialogProps = {
  orderId: string | null;
  onClose: () => void;
  onEdit: (orderId: string) => void;
};

function formatOrderDate(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function AdminOrderDetailDialog({
  orderId,
  onClose,
  onEdit,
}: AdminOrderDetailDialogProps) {
  const open = Boolean(orderId);
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [historyOpen, setHistoryOpen] = useState(false);
  const [blockNote, setBlockNote] = useState("");
  const { data: order, isPending, isError, error } = useQuery({
    queryKey: queryKeys.admin.order(orderId ?? ""),
    queryFn: () => fetchAdminOrderDetail(orderId!),
    enabled: open && Boolean(orderId),
  });
  const { data: blockedIps } = useQuery({
    queryKey: queryKeys.admin.blockedIps(),
    queryFn: fetchBlockedIps,
    enabled: open,
  });
  const customerIp = order?.customerIp?.trim() ?? "";
  const ipBlocked = Boolean(customerIp && blockedIps?.some((row) => row.ip === customerIp));

  const blockMutation = useMutation({
    mutationFn: () =>
      blockCustomerIp({
        ip: customerIp,
        note: blockNote,
        orderNumber: order?.orderNumber,
        customerName: order?.customer.name,
      }),
    onSuccess: async () => {
      setBlockNote("");
      showToast("IP blocked");
      await queryClient.invalidateQueries({ queryKey: queryKeys.admin.blockedIps() });
    },
    onError: (err) => {
      showToast(err instanceof Error ? err.message : "Failed to block IP", "error");
    },
  });

  const unblockMutation = useMutation({
    mutationFn: () => unblockCustomerIp(customerIp),
    onSuccess: async () => {
      showToast("IP unblocked");
      await queryClient.invalidateQueries({ queryKey: queryKeys.admin.blockedIps() });
    },
    onError: (err) => {
      showToast(err instanceof Error ? err.message : "Failed to unblock IP", "error");
    },
  });

  const chip = order ? statusChipSx[order.status] : null;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ pb: 1 }}>
        {order ? `Order #${order.orderNumber}` : "Order details"}
      </DialogTitle>
      <DialogContent dividers>
        {isPending ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
            <CircularProgress size={28} />
          </Box>
        ) : isError || !order ? (
          <Typography color="error" sx={{ py: 2 }}>
            {error instanceof Error ? error.message : "Failed to load order"}
          </Typography>
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2.25 }}>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, alignItems: "center" }}>
              {chip ? (
                <Chip
                  label={ADMIN_ORDER_STATUS_LABELS[order.status]}
                  size="small"
                  sx={{
                    borderRadius: 1,
                    fontWeight: 600,
                    fontSize: "0.7rem",
                    bgcolor: chip.bgcolor,
                    color: chip.color,
                    border: `1px solid ${chip.border}`,
                  }}
                />
              ) : null}
              <Typography sx={{ fontSize: "0.8rem", color: "text.secondary" }}>
                Placed {formatOrderDate(order.createdAt)}
              </Typography>
            </Box>

            <Box>
              <Typography
                sx={{
                  fontSize: "0.7rem",
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: ADMIN_ACCENT,
                  mb: 0.75,
                }}
              >
                Customer
              </Typography>
              <Typography sx={{ fontWeight: 600 }}>{order.customer.name}</Typography>
              <Typography sx={{ fontSize: "0.875rem", color: "text.secondary" }}>
                {order.customer.phone}
                {order.customer.email ? ` · ${order.customer.email}` : ""}
              </Typography>
              {(order.customer.address || order.customer.city) && (
                <Typography sx={{ mt: 0.75, fontSize: "0.875rem", color: "text.secondary" }}>
                  {[order.customer.address, order.customer.city, order.customer.region]
                    .filter(Boolean)
                    .join(", ")}
                </Typography>
              )}
              {order.customer.deliveryArea ? (
                <Typography sx={{ mt: 0.5, fontSize: "0.8rem", color: "text.secondary" }}>
                  Delivery area: {order.customer.deliveryArea}
                </Typography>
              ) : null}
              <Box sx={{ mt: 0.75, display: "flex", alignItems: "center", gap: 0.25 }}>
                <Typography sx={{ fontSize: "0.8rem", color: "text.secondary" }}>
                  IP: {customerIp || "Not recorded"}
                  {ipBlocked ? " · Blocked" : ""}
                </Typography>
                {customerIp ? (
                  <Tooltip title="Copy IP">
                    <IconButton
                      size="small"
                      aria-label="Copy IP"
                      onClick={() => {
                        void navigator.clipboard.writeText(customerIp).then(
                          () => showToast("IP copied"),
                          () => showToast("Could not copy IP", "error"),
                        );
                      }}
                    >
                      <ContentCopyRoundedIcon sx={{ fontSize: 15 }} />
                    </IconButton>
                  </Tooltip>
                ) : null}
              </Box>
              {customerIp ? (
                <Box sx={{ mt: 1, display: "flex", flexWrap: "wrap", gap: 1, alignItems: "center" }}>
                  {ipBlocked ? (
                    <Button
                      size="small"
                      onClick={() => unblockMutation.mutate()}
                      disabled={unblockMutation.isPending}
                      sx={{ textTransform: "none" }}
                    >
                      {unblockMutation.isPending ? "Unblocking…" : "Unblock IP"}
                    </Button>
                  ) : (
                    <>
                      <TextField
                        size="small"
                        placeholder="Note (optional)"
                        value={blockNote}
                        onChange={(event) => setBlockNote(event.target.value)}
                        sx={{ minWidth: 180 }}
                      />
                      <Button
                        size="small"
                        color="error"
                        variant="outlined"
                        startIcon={<BlockOutlinedIcon />}
                        onClick={() => blockMutation.mutate()}
                        disabled={blockMutation.isPending}
                        sx={{ textTransform: "none" }}
                      >
                        {blockMutation.isPending ? "Blocking…" : "Block IP"}
                      </Button>
                    </>
                  )}
                </Box>
              ) : null}
              {order.customer.note ? (
                <Typography
                  sx={{
                    mt: 1,
                    fontSize: "0.85rem",
                    bgcolor: "#f8fafc",
                    borderRadius: 1,
                    px: 1.25,
                    py: 1,
                  }}
                >
                  Note: {order.customer.note}
                </Typography>
              ) : null}
            </Box>

            <Divider />

            <Box>
              <Typography
                sx={{
                  fontSize: "0.7rem",
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: ADMIN_ACCENT,
                  mb: 1,
                }}
              >
                Items
              </Typography>
              {order.items.length === 0 ? (
                <Typography sx={{ fontSize: "0.875rem", color: "text.secondary" }}>
                  {order.itemsSummary || "No line items recorded"}
                  {order.itemCount > 0 ? ` (${order.itemCount} items)` : ""}
                </Typography>
              ) : (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
                  {order.items.map((item, index) => (
                    <Box
                      key={`${item.productId}-${item.size}-${item.color}-${index}`}
                      sx={{ display: "flex", gap: 1.25, alignItems: "flex-start" }}
                    >
                      {item.image ? (
                        <Box
                          component="img"
                          src={item.image}
                          alt=""
                          sx={{
                            width: 48,
                            height: 48,
                            objectFit: "cover",
                            borderRadius: 1,
                            bgcolor: "#f1f5f9",
                          }}
                        />
                      ) : null}
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography sx={{ fontSize: "0.875rem", fontWeight: 600 }}>
                          {item.name}
                        </Typography>
                        <Typography sx={{ fontSize: "0.75rem", color: "text.secondary" }}>
                          {item.size} · {item.color} · Qty {item.quantity}
                        </Typography>
                      </Box>
                      <Typography sx={{ fontSize: "0.875rem", fontWeight: 600 }}>
                        {formatCurrency(item.price * item.quantity, item.currency)}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              )}
            </Box>

            <Divider />

            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
              <Row label="Subtotal" value={formatCurrency(order.subtotal, order.currency)} />
              <Row
                label="Delivery"
                value={
                  order.shippingFee > 0
                    ? formatCurrency(order.shippingFee, order.currency)
                    : "Free"
                }
              />
              {(order.discount ?? 0) > 0 ? (
                <Row
                  label="Discount"
                  value={`−${formatCurrency(order.discount, order.currency)}`}
                />
              ) : null}
              <Row
                label="Total"
                value={formatCurrency(order.total, order.currency)}
                bold
              />
              <Typography sx={{ mt: 0.5, fontSize: "0.75rem", color: "text.secondary" }}>
                Payment: Cash on delivery
              </Typography>
            </Box>
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2, justifyContent: "space-between" }}>
        <Button
          startIcon={<HistoryOutlinedIcon />}
          onClick={() => setHistoryOpen(true)}
          disabled={!order}
          sx={{ textTransform: "none" }}
        >
          Check histories
        </Button>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button onClick={onClose} sx={{ textTransform: "none" }}>
            Close
          </Button>
          {order ? (
            <Button
              variant="contained"
              onClick={(): void => onEdit(order.id)}
              sx={{ textTransform: "none", bgcolor: ADMIN_ACCENT }}
            >
              Edit order
            </Button>
          ) : null}
        </Box>
      </DialogActions>

      <AdminOrderHistoryDialog
        orderId={historyOpen ? orderId : null}
        onClose={() => setHistoryOpen(false)}
      />
    </Dialog>
  );
}

function Row({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}>
      <Typography
        sx={{
          fontSize: "0.875rem",
          color: bold ? "text.primary" : "text.secondary",
          fontWeight: bold ? 700 : 400,
        }}
      >
        {label}
      </Typography>
      <Typography sx={{ fontSize: "0.875rem", fontWeight: bold ? 700 : 600 }}>
        {value}
      </Typography>
    </Box>
  );
}
