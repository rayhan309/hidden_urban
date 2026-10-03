"use client";

import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import PhoneOutlinedIcon from "@mui/icons-material/PhoneOutlined";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import SellOutlinedIcon from "@mui/icons-material/SellOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import {
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  Stack,
} from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useMemo, useState } from "react";
import { AdminOrderDetailDialog } from "@/components/admin/orders/AdminOrderDetailDialog";
import { AdminOrderEditDialog } from "@/components/admin/orders/AdminOrderEditDialog";
import { AdminOrderMobileCard } from "@/components/admin/orders/AdminOrderMobileCard";
import { BlockedIpBadge, SameIpBadge } from "@/components/admin/orders/SameIpBadge";
import { SteadfastConsignmentBadge } from "@/components/admin/orders/SteadfastConsignmentBadge";
import { useToast } from "@/context/toast/ToastProvider";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { ADMIN_ACCENT } from "@/lib/constants/admin";
import { printOrderInvoice } from "@/lib/orders/print-invoice";
import { printOrderSticker } from "@/lib/orders/print-sticker";
import { queryKeys } from "@/lib/queries/query-keys";
import { fetchBlockedIps } from "@/services/admin-blocked-ips";
import {
  deleteAdminOrder,
  fetchAdminOrderDetail,
  sendOrderToSteadfast,
} from "@/services/admin-order-mutations";
import {
  ADMIN_ORDER_STATUS_FILTERS,
  ADMIN_ORDER_STATUS_LABELS,
  type AdminOrder,
  type AdminOrderStatus,
} from "@/types/admin-order";

const PAGE_SIZE = 20;

const DATE_RANGES = [
  { value: "lifetime", label: "Lifetime" },
  { value: "today", label: "Today" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "month", label: "This month" },
] as const;

type DateRange = (typeof DATE_RANGES)[number]["value"];

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

function formatBdt(value: number) {
  return `৳${value.toLocaleString("en-BD")}`;
}

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

function phoneToWhatsApp(phone: string) {
  const digits = phone.replace(/\D/g, "");
  const normalized = digits.startsWith("880") ? digits : `88${digits.replace(/^0/, "")}`;
  return `https://wa.me/${normalized}`;
}

function phoneToTel(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return `tel:+${digits.startsWith("880") ? digits : `88${digits.replace(/^0/, "")}`}`;
}

function normalizePhone(phone: string) {
  return phone.replace(/\D/g, "").replace(/^880/, "0");
}

function orderSentToSteadfast(order: AdminOrder) {
  return order.steadfastConsignmentId != null && order.steadfastConsignmentId !== "";
}

function matchesDateRange(createdAt: string, range: DateRange) {
  if (range === "lifetime") return true;
  const date = new Date(createdAt);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (range === "today") return date >= startOfToday;
  if (range === "7d") {
    const from = new Date(startOfToday);
    from.setDate(from.getDate() - 7);
    return date >= from;
  }
  if (range === "30d") {
    const from = new Date(startOfToday);
    from.setDate(from.getDate() - 30);
    return date >= from;
  }
  if (range === "month") {
    return (
      date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
    );
  }
  return true;
}

type AdminOrdersViewProps = {
  orders: AdminOrder[];
};

export function AdminOrdersView({ orders }: AdminOrdersViewProps) {
  const queryClient = useQueryClient();
  const settings = useSiteSettings();
  const { showToast } = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | AdminOrderStatus>("all");
  const [dateRange, setDateRange] = useState<DateRange>("lifetime");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [viewOrderId, setViewOrderId] = useState<string | null>(null);
  const [editOrderId, setEditOrderId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminOrder | null>(null);
  const [sendingOrderId, setSendingOrderId] = useState<string | null>(null);
  const [printBusyId, setPrintBusyId] = useState<string | null>(null);
  const [refetching, setRefetching] = useState(false);

  const shopInfo = {
    shopName: settings.shopName || settings.businessName || "Hidden Urban",
    contactEmail: settings.contactEmail,
    contactPhone: settings.contactPhone,
    contactAddress: settings.contactAddress,
  };

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteAdminOrder(id),
    onSuccess: async () => {
      const deletedId = deleteTarget?.id;
      setDeleteTarget(null);
      if (deletedId) {
        setSelected((prev) => {
          const next = new Set(prev);
          next.delete(deletedId);
          return next;
        });
      }
      showToast("Order deleted successfully");
      await queryClient.invalidateQueries({ queryKey: queryKeys.admin.orders() });
    },
    onError: (error) => {
      showToast(error instanceof Error ? error.message : "Failed to delete order", "error");
    },
  });

  const steadfastMutation = useMutation({
    mutationFn: (id: string) => sendOrderToSteadfast(id),
    onMutate: (id) => {
      setSendingOrderId(id);
    },
    onSuccess: async (result) => {
      queryClient.setQueryData<AdminOrder[]>(queryKeys.admin.orders(), (current) =>
        current?.map((entry) =>
          entry.id === result.order.id
            ? {
                ...entry,
                status: result.order.status,
                steadfastConsignmentId: result.consignmentId,
              }
            : entry,
        ),
      );
      showToast(
        result.trackingCode
          ? `Sent to Steadfast (${result.trackingCode})`
          : "Sent to Steadfast",
      );
      await queryClient.invalidateQueries({ queryKey: queryKeys.admin.orders() });
    },
    onError: (error) => {
      showToast(
        error instanceof Error ? error.message : "Failed to send to courier",
        "error",
      );
    },
    onSettled: () => {
      setSendingOrderId(null);
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter((order) => {
      if (statusFilter !== "all" && order.status !== statusFilter) return false;
      if (!matchesDateRange(order.createdAt, dateRange)) return false;
      if (!q) return true;
      return (
        order.orderNumber.toLowerCase().includes(q) ||
        order.customerName.toLowerCase().includes(q) ||
        order.customerPhone.includes(q.replace(/\s/g, "")) ||
        (order.customerIp ?? "").toLowerCase().includes(q)
      );
    });
  }, [orders, search, statusFilter, dateRange]);

  const { data: blockedIps } = useQuery({
    queryKey: queryKeys.admin.blockedIps(),
    queryFn: fetchBlockedIps,
  });

  const blockedIpSet = useMemo(() => {
    return new Set(
      (blockedIps ?? []).map((row) => row.ip.trim().toLowerCase()).filter(Boolean),
    );
  }, [blockedIps]);

  const sameIpCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const order of orders) {
      const ip = order.customerIp?.trim().toLowerCase();
      if (!ip) continue;
      counts.set(ip, (counts.get(ip) ?? 0) + 1);
    }
    return counts;
  }, [orders]);

  const repeatPhones = useMemo(() => {
    const counts = new Map<string, number>();
    for (const order of orders) {
      const phone = normalizePhone(order.customerPhone);
      if (!phone) continue;
      counts.set(phone, (counts.get(phone) ?? 0) + 1);
    }
    const repeats = new Set<string>();
    for (const [phone, count] of counts) {
      if (count > 1) repeats.add(phone);
    }
    return repeats;
  }, [orders]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const pageOrders = filtered.slice(pageStart, pageStart + PAGE_SIZE);

  const allPageSelected =
    pageOrders.length > 0 && pageOrders.every((o) => selected.has(o.id));

  function toggleAllPage() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allPageSelected) {
        pageOrders.forEach((o) => next.delete(o.id));
      } else {
        pageOrders.forEach((o) => next.add(o.id));
      }
      return next;
    });
  }

  function toggleRow(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function copyPhone(phone: string) {
    try {
      await navigator.clipboard.writeText(phone);
      showToast("Phone copied");
    } catch {
      /* ignore */
    }
  }

  async function copyIp(ip: string) {
    try {
      await navigator.clipboard.writeText(ip);
      showToast("IP copied");
    } catch {
      /* ignore */
    }
  }

  async function handleRefetch() {
    setRefetching(true);
    try {
      await queryClient.invalidateQueries({ queryKey: queryKeys.admin.orders() });
      await queryClient.refetchQueries({ queryKey: queryKeys.admin.orders() });
      showToast("Orders refreshed");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Could not refresh orders", "error");
    } finally {
      setRefetching(false);
    }
  }

  async function handlePrintInvoice(orderId: string) {
    setPrintBusyId(`invoice:${orderId}`);
    try {
      const order = await fetchAdminOrderDetail(orderId);
      printOrderInvoice(order, shopInfo);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Could not print invoice", "error");
    } finally {
      setPrintBusyId(null);
    }
  }

  async function handlePrintSticker(orderId: string) {
    setPrintBusyId(`sticker:${orderId}`);
    try {
      const order = await fetchAdminOrderDetail(orderId);
      printOrderSticker(order, {
        shopName: shopInfo.shopName,
        contactPhone: shopInfo.contactPhone,
      });
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Could not print sticker", "error");
    } finally {
      setPrintBusyId(null);
    }
  }

  return (
    <Box sx={{ width: "100%", minWidth: 0 }}>
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          alignItems: { md: "flex-start" },
          justifyContent: "space-between",
          gap: 2,
          mb: 2.5,
        }}
      >
        <Box>
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
          <Typography
            sx={{
              mt: 0.5,
              fontSize: { xs: "1.35rem", sm: "1.5rem" },
              fontWeight: 700,
              letterSpacing: "-0.02em",
            }}
          >
            Orders
          </Typography>
          <Typography sx={{ mt: 0.5, fontSize: "0.9rem", color: "text.secondary" }}>
            View, update status, and manage customer orders.
          </Typography>
        </Box>

        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: { md: "flex-end" },
            justifyContent: { md: "flex-end" },
            gap: 1.25,
          }}
        >
          <Button
            component={Link}
            href="/dashboard/admin/orders/blocked-ips"
            variant="outlined"
            size="small"
            sx={{
              textTransform: "none",
              fontWeight: 600,
              borderColor: "rgba(0,0,0,0.12)",
              color: "text.primary",
              height: 40,
            }}
          >
            Blocked IPs
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={
              refetching ? (
                <CircularProgress size={14} color="inherit" />
              ) : (
                <RefreshRoundedIcon sx={{ fontSize: 18 }} />
              )
            }
            onClick={() => void handleRefetch()}
            disabled={refetching}
            sx={{
              textTransform: "none",
              fontWeight: 600,
              borderColor: "rgba(0,0,0,0.12)",
              color: "text.primary",
              height: 40,
            }}
          >
            {refetching ? "Refreshing…" : "Refetch"}
          </Button>
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: { md: "flex-end" } }}>
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel id="orders-date-range">Filter by date</InputLabel>
              <Select
                labelId="orders-date-range"
                label="Filter by date"
                value={dateRange}
                onChange={(e) => {
                  setDateRange(e.target.value as DateRange);
                  setPage(1);
                }}
              >
                {DATE_RANGES.map((r) => (
                  <MenuItem key={r.value} value={r.value}>
                    {r.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Typography sx={{ mt: 0.75, fontSize: "0.8rem", color: "text.secondary" }}>
              {filtered.length} total order{filtered.length === 1 ? "" : "s"}
            </Typography>
          </Box>
        </Box>
      </Box>

      <Box
        sx={{
          borderRadius: 2,
          border: "1px solid",
          borderColor: "rgba(0,0,0,0.06)",
          bgcolor: "#fff",
          boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
          overflow: "hidden",
        }}
      >
        <Box sx={{ p: 2, borderBottom: "1px solid", borderColor: "rgba(0,0,0,0.06)" }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search by order ID, name, phone, or IP..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            sx={{ width: "100%", bgcolor: "#f8fafc" }}
          />

          <Box sx={{ mt: 1.5, display: "flex", flexWrap: "wrap", gap: 1 }}>
            {ADMIN_ORDER_STATUS_FILTERS.map((filter) => {
              const active = statusFilter === filter.id;
              return (
                <Button
                  key={filter.id}
                  size="small"
                  onClick={() => {
                    setStatusFilter(filter.id);
                    setPage(1);
                  }}
                  sx={{
                    borderRadius: 999,
                    px: 1.75,
                    py: 0.5,
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    textTransform: "none",
                    border: "1px solid",
                    borderColor: active ? ADMIN_ACCENT : "rgba(0,0,0,0.1)",
                    bgcolor: active ? ADMIN_ACCENT : "#fff",
                    color: active ? "#fff" : "text.primary",
                    "&:hover": {
                      bgcolor: active ? "#185a4a" : "rgba(31,111,91,0.06)",
                      borderColor: active ? "#185a4a" : ADMIN_ACCENT,
                    },
                  }}
                >
                  {filter.label}
                </Button>
              );
            })}
          </Box>
        </Box>

        <Stack
          spacing={1.5}
          sx={{
            display: { xs: "flex", md: "none" },
            p: 1.5,
            bgcolor: "#f8fafc",
          }}
        >
          {pageOrders.length === 0 ? (
            <Box sx={{ py: 5, textAlign: "center" }}>
              <Typography color="text.secondary">No orders match your filters.</Typography>
            </Box>
          ) : (
            pageOrders.map((order) => (
              <AdminOrderMobileCard
                key={order.id}
                order={order}
                sameIpCount={sameIpCounts.get(order.customerIp?.trim().toLowerCase() ?? "") ?? 0}
                ipBlocked={blockedIpSet.has(order.customerIp?.trim().toLowerCase() ?? "")}
                selected={selected.has(order.id)}
                sending={sendingOrderId === order.id}
                onToggleSelect={() => toggleRow(order.id)}
                onCopyPhone={copyPhone}
                onCopyIp={copyIp}
                onView={() => setViewOrderId(order.id)}
                onEdit={() => setEditOrderId(order.id)}
                onDelete={() => setDeleteTarget(order)}
                onSendToCourier={() => steadfastMutation.mutate(order.id)}
                onCopyConsignment={() => showToast("Consignment ID copied")}
                formatBdt={formatBdt}
                formatOrderDate={formatOrderDate}
                phoneToTel={phoneToTel}
                phoneToWhatsApp={phoneToWhatsApp}
              />
            ))
          )}
        </Stack>

        <TableContainer sx={{ width: "100%", overflowX: "auto", display: { xs: "none", md: "block" } }}>
          <Table size="small" sx={{ width: "100%", minWidth: 1100 }}>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox" sx={{ bgcolor: "#f8fafc" }}>
                  <Checkbox
                    size="small"
                    checked={allPageSelected}
                    indeterminate={
                      !allPageSelected && pageOrders.some((o) => selected.has(o.id))
                    }
                    onChange={toggleAllPage}
                  />
                </TableCell>
                {["Order", "Customer", "Items", "Total", "Status", "Date", "Actions"].map(
                  (h) => (
                    <TableCell
                      key={h}
                      sx={{
                        fontWeight: 700,
                        fontSize: "0.7rem",
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                        color: "text.secondary",
                        bgcolor: "#f8fafc",
                        borderBottomColor: "rgba(0,0,0,0.06)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {h}
                    </TableCell>
                  ),
                )}
              </TableRow>
            </TableHead>
            <TableBody>
              {pageOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} sx={{ py: 6, textAlign: "center" }}>
                    <Typography color="text.secondary">No orders match your filters.</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                pageOrders.map((order) => {
                  const chip = statusChipSx[order.status];
                  const invoiceBusy = printBusyId === `invoice:${order.id}`;
                  const stickerBusy = printBusyId === `sticker:${order.id}`;
                  const sameIpCount =
                    sameIpCounts.get(order.customerIp?.trim().toLowerCase() ?? "") ?? 0;
                  const sameIp = sameIpCount > 1 && order.customerIp?.trim();
                  const ipBlocked = blockedIpSet.has(order.customerIp?.trim().toLowerCase() ?? "");
                  return (
                    <TableRow
                      key={order.id}
                      hover
                      selected={selected.has(order.id)}
                      sx={
                        ipBlocked
                          ? { bgcolor: "#fef2f2" }
                          : sameIp
                            ? { bgcolor: "#fffbeb" }
                            : undefined
                      }
                    >
                      <TableCell padding="checkbox">
                        <Checkbox
                          size="small"
                          checked={selected.has(order.id)}
                          onChange={() => toggleRow(order.id)}
                        />
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700, whiteSpace: "nowrap" }}>
                        #{order.orderNumber}
                      </TableCell>
                      <TableCell sx={{ minWidth: 200 }}>
                        <Box
                          sx={{
                            display: "flex",
                            flexWrap: "wrap",
                            alignItems: "center",
                            gap: 0.75,
                          }}
                        >
                          <Typography sx={{ fontSize: "0.85rem", fontWeight: 600 }}>
                            {order.customerName}
                          </Typography>
                          {ipBlocked ? <BlockedIpBadge /> : null}
                          {sameIp ? (
                            <SameIpBadge ip={order.customerIp!.trim()} count={sameIpCount} />
                          ) : null}
                          {repeatPhones.has(normalizePhone(order.customerPhone)) ? (
                            <Box
                              component={Link}
                              href={`/dashboard/admin/reports/repeat-customers?phone=${encodeURIComponent(order.customerPhone)}`}
                              sx={{
                                display: "inline-flex",
                                alignItems: "center",
                                px: 0.9,
                                py: 0.15,
                                borderRadius: 999,
                                border: "1px solid #f87171",
                                bgcolor: "#fef2f2",
                                color: "#dc2626",
                                fontSize: "0.65rem",
                                fontWeight: 600,
                                lineHeight: 1.4,
                                whiteSpace: "nowrap",
                                textDecoration: "none",
                                "&:hover": {
                                  bgcolor: "#fee2e2",
                                  borderColor: "#ef4444",
                                },
                              }}
                            >
                              Repeat customer
                            </Box>
                          ) : null}
                        </Box>
                        {order.customerIp?.trim() ? (
                          <Box sx={{ display: "flex", alignItems: "center", gap: 0.25, mt: 0.25 }}>
                            <Typography
                              sx={{ fontSize: "0.75rem", color: "text.secondary", fontFamily: "ui-monospace, monospace" }}
                            >
                              {order.customerIp.trim()}
                            </Typography>
                            <Tooltip title="Copy IP">
                              <IconButton
                                size="small"
                                aria-label="Copy IP"
                                onClick={() => void copyIp(order.customerIp!.trim())}
                              >
                                <ContentCopyRoundedIcon sx={{ fontSize: 15 }} />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        ) : null}
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.25, mt: 0.35 }}>
                          <Typography sx={{ fontSize: "0.8rem", color: "text.secondary" }}>
                            {order.customerPhone}
                          </Typography>
                          <Tooltip title="Copy phone">
                            <IconButton
                              size="small"
                              aria-label="Copy phone"
                              onClick={() => void copyPhone(order.customerPhone)}
                            >
                              <ContentCopyRoundedIcon sx={{ fontSize: 15 }} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Call">
                            <IconButton
                              size="small"
                              component="a"
                              href={phoneToTel(order.customerPhone)}
                              aria-label="Call customer"
                            >
                              <PhoneOutlinedIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="WhatsApp">
                            <IconButton
                              size="small"
                              component="a"
                              href={phoneToWhatsApp(order.customerPhone)}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label="WhatsApp"
                              sx={{ color: "#25d366" }}
                            >
                              <WhatsAppIcon sx={{ fontSize: 17 }} />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ maxWidth: 220 }}>
                        <Typography
                          sx={{
                            fontSize: "0.85rem",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {order.itemsSummary}
                        </Typography>
                        {order.itemCount > 1 ? (
                          <Typography sx={{ fontSize: "0.7rem", color: "text.secondary" }}>
                            {order.itemCount} items
                          </Typography>
                        ) : null}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700, whiteSpace: "nowrap" }}>
                        {formatBdt(order.total)}
                      </TableCell>
                      <TableCell>
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
                      </TableCell>
                      <TableCell
                        sx={{
                          fontSize: "0.8rem",
                          color: "text.secondary",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {formatOrderDate(order.createdAt)}
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.25 }}>
                          <Tooltip title="Print invoice">
                            <span>
                              <IconButton
                                size="small"
                                aria-label="Print invoice"
                                disabled={Boolean(printBusyId)}
                                onClick={() => void handlePrintInvoice(order.id)}
                              >
                                {invoiceBusy ? (
                                  <CircularProgress size={16} />
                                ) : (
                                  <DescriptionOutlinedIcon
                                    sx={{ fontSize: 18, color: ADMIN_ACCENT }}
                                  />
                                )}
                              </IconButton>
                            </span>
                          </Tooltip>
                          <Tooltip title="Print sticker">
                            <span>
                              <IconButton
                                size="small"
                                aria-label="Print sticker"
                                disabled={Boolean(printBusyId)}
                                onClick={() => void handlePrintSticker(order.id)}
                              >
                                {stickerBusy ? (
                                  <CircularProgress size={16} />
                                ) : (
                                  <SellOutlinedIcon sx={{ fontSize: 18, color: "#16a34a" }} />
                                )}
                              </IconButton>
                            </span>
                          </Tooltip>
                          {orderSentToSteadfast(order) ? (
                            <SteadfastConsignmentBadge
                              consignmentId={order.steadfastConsignmentId!}
                              onCopied={() => showToast("Consignment ID copied")}
                            />
                          ) : (
                            <>
                              <Tooltip title="Send to Steadfast courier">
                                <span>
                                  <IconButton
                                    size="small"
                                    aria-label="Send to courier"
                                    disabled={
                                      sendingOrderId === order.id ||
                                      steadfastMutation.isPending
                                    }
                                    onClick={() => steadfastMutation.mutate(order.id)}
                                    sx={{ display: { lg: "none" }, color: "#7c3aed" }}
                                  >
                                    {sendingOrderId === order.id ? (
                                      <CircularProgress size={16} />
                                    ) : (
                                      <LocalShippingOutlinedIcon sx={{ fontSize: 18 }} />
                                    )}
                                  </IconButton>
                                </span>
                              </Tooltip>
                              <Tooltip title="Send to Steadfast courier">
                                <span>
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    disabled={
                                      sendingOrderId === order.id ||
                                      steadfastMutation.isPending
                                    }
                                    onClick={() => steadfastMutation.mutate(order.id)}
                                    startIcon={
                                      <LocalShippingOutlinedIcon sx={{ fontSize: 16 }} />
                                    }
                                    sx={{
                                      ml: 0.5,
                                      mr: 0.5,
                                      py: 0.35,
                                      fontSize: "0.7rem",
                                      fontWeight: 600,
                                      textTransform: "none",
                                      borderColor: "rgba(0,0,0,0.12)",
                                      color: "text.primary",
                                      whiteSpace: "nowrap",
                                      display: { xs: "none", lg: "inline-flex" },
                                    }}
                                  >
                                    {sendingOrderId === order.id
                                      ? "Sending..."
                                      : "Send to courier"}
                                  </Button>
                                </span>
                              </Tooltip>
                            </>
                          )}
                          <Tooltip title="View">
                            <IconButton
                              size="small"
                              aria-label="View order"
                              onClick={() => setViewOrderId(order.id)}
                            >
                              <VisibilityOutlinedIcon sx={{ fontSize: 18 }} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Edit">
                            <IconButton
                              size="small"
                              aria-label="Edit order"
                              onClick={() => setEditOrderId(order.id)}
                            >
                              <EditOutlinedIcon sx={{ fontSize: 18, color: ADMIN_ACCENT }} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton
                              size="small"
                              aria-label="Delete order"
                              onClick={() => setDeleteTarget(order)}
                            >
                              <DeleteOutlineRoundedIcon
                                sx={{ fontSize: 18, color: "#dc2626" }}
                              />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <Box
          sx={{
            px: 2,
            py: 1.5,
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1,
            borderTop: "1px solid",
            borderColor: "rgba(0,0,0,0.06)",
            bgcolor: "#fafafa",
          }}
        >
          <Typography sx={{ fontSize: "0.8rem", color: "text.secondary" }}>
            {filtered.length === 0
              ? "Showing 0 of 0"
              : `Showing ${pageStart + 1}–${Math.min(pageStart + PAGE_SIZE, filtered.length)} of ${filtered.length}`}
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Button
              size="small"
              disabled={currentPage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              sx={{ textTransform: "none", minWidth: 72 }}
            >
              Previous
            </Button>
            <Typography sx={{ fontSize: "0.8rem", color: "text.secondary" }}>
              Page {currentPage} / {totalPages}
            </Typography>
            <Button
              size="small"
              disabled={currentPage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              sx={{ textTransform: "none", minWidth: 56 }}
            >
              Next
            </Button>
          </Box>
        </Box>
      </Box>

      <AdminOrderDetailDialog
        orderId={viewOrderId}
        onClose={() => setViewOrderId(null)}
        onEdit={(id) => {
          setViewOrderId(null);
          setEditOrderId(id);
        }}
      />

      <AdminOrderEditDialog
        orderId={editOrderId}
        onClose={() => setEditOrderId(null)}
      />

      <Dialog
        open={Boolean(deleteTarget)}
        onClose={() => !deleteMutation.isPending && setDeleteTarget(null)}
      >
        <DialogTitle>Delete order?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {deleteTarget
              ? `Order #${deleteTarget.orderNumber} for ${deleteTarget.customerName} will be permanently removed.`
              : ""}
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setDeleteTarget(null)}
            disabled={deleteMutation.isPending}
            sx={{ textTransform: "none" }}
          >
            Cancel
          </Button>
          <Button
            color="error"
            variant="contained"
            disabled={deleteMutation.isPending || !deleteTarget}
            onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            sx={{ textTransform: "none" }}
          >
            {deleteMutation.isPending ? "Deleting…" : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
