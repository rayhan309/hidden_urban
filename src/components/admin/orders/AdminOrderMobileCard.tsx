"use client";

import type { ReactNode } from "react";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import LaunchOutlinedIcon from "@mui/icons-material/LaunchOutlined";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import PhoneOutlinedIcon from "@mui/icons-material/PhoneOutlined";
import SellOutlinedIcon from "@mui/icons-material/SellOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import {
  Box,
  Checkbox,
  Chip,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { BlockedIpBadge, SameIpBadge } from "@/components/admin/orders/SameIpBadge";
import { SteadfastConsignmentBadge } from "@/components/admin/orders/SteadfastConsignmentBadge";
import { ADMIN_ACCENT } from "@/lib/constants/admin";
import {
  ADMIN_ORDER_STATUS_LABELS,
  type AdminOrder,
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

const phoneActionSx = {
  border: "1px solid",
  borderColor: "rgba(0,0,0,0.1)",
  borderRadius: 1,
  width: 34,
  height: 34,
} as const;

const footerActionSx = {
  border: "1px solid",
  borderColor: "rgba(0,0,0,0.1)",
  borderRadius: 1,
  width: 36,
  height: 36,
} as const;

type AdminOrderMobileCardProps = {
  order: AdminOrder;
  sameIpCount?: number;
  ipBlocked?: boolean;
  selected: boolean;
  sending: boolean;
  onToggleSelect: () => void;
  onCopyPhone: (phone: string) => void;
  onCopyIp?: (ip: string) => void;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onSendToCourier: () => void;
  onCopyConsignment?: () => void;
  formatBdt: (value: number) => string;
  formatOrderDate: (iso: string) => string;
  phoneToTel: (phone: string) => string;
  phoneToWhatsApp: (phone: string) => string;
};

function DetailRow({
  label,
  value,
  valueSx,
}: {
  label: string;
  value: ReactNode;
  valueSx?: object;
}) {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 2,
        py: 1.25,
        borderBottom: "1px solid",
        borderColor: "rgba(0,0,0,0.06)",
      }}
    >
      <Typography sx={{ fontSize: "0.8rem", color: "text.secondary", flexShrink: 0 }}>
        {label}
      </Typography>
      <Typography
        component="div"
        sx={{
          fontSize: "0.85rem",
          fontWeight: 600,
          textAlign: "right",
          ...valueSx,
        }}
      >
        {value}
      </Typography>
    </Box>
  );
}

export function AdminOrderMobileCard({
  order,
  sameIpCount = 0,
  ipBlocked = false,
  selected,
  sending,
  onToggleSelect,
  onCopyPhone,
  onCopyIp,
  onView,
  onEdit,
  onDelete,
  onSendToCourier,
  onCopyConsignment,
  formatBdt,
  formatOrderDate,
  phoneToTel,
  phoneToWhatsApp,
}: AdminOrderMobileCardProps) {
  const chip = statusChipSx[order.status];
  const sameIp = sameIpCount > 1 && order.customerIp?.trim();
  const sentToSteadfast =
    order.steadfastConsignmentId != null && order.steadfastConsignmentId !== "";
  const courierDisabled = sentToSteadfast || sending;

  return (
    <Box
      sx={{
        border: "1px solid",
        borderColor: selected
          ? ADMIN_ACCENT
          : ipBlocked
            ? "#fca5a5"
            : sameIp
              ? "#fbbf24"
              : "rgba(0,0,0,0.08)",
        borderRadius: 2,
        bgcolor: ipBlocked ? "#fef2f2" : sameIp ? "#fffbeb" : "#fff",
        overflow: "hidden",
        boxShadow: selected ? "0 0 0 1px rgba(31,111,91,0.15)" : "none",
      }}
    >
      <Box sx={{ px: 1.5, pt: 1.5, pb: 1 }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 1,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "flex-start", gap: 0.5, minWidth: 0 }}>
            <Checkbox
              size="small"
              checked={selected}
              onChange={onToggleSelect}
              sx={{ mt: -0.25, ml: -0.5 }}
            />
            <Box sx={{ minWidth: 0 }}>
              <Typography
                sx={{
                  fontWeight: 700,
                  fontSize: "0.95rem",
                  letterSpacing: "-0.02em",
                }}
              >
                #{order.orderNumber}
              </Typography>
              <Typography sx={{ mt: 0.25, fontSize: "0.75rem", color: "text.secondary" }}>
                {formatOrderDate(order.createdAt)}
              </Typography>
            </Box>
          </Box>

          <Chip
            label={ADMIN_ORDER_STATUS_LABELS[order.status]}
            size="small"
            sx={{
              borderRadius: 999,
              fontWeight: 600,
              fontSize: "0.68rem",
              height: 24,
              bgcolor: chip.bgcolor,
              color: chip.color,
              border: `1px solid ${chip.border}`,
              flexShrink: 0,
            }}
          />
        </Box>
      </Box>

      <Box sx={{ px: 1.5 }}>
        {order.customerIp?.trim() ? (
          <DetailRow
            label="IP"
            value={
              <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.25 }}>
                <span>{order.customerIp.trim()}</span>
                {onCopyIp ? (
                  <Tooltip title="Copy IP">
                    <IconButton
                      size="small"
                      aria-label="Copy IP"
                      onClick={() => onCopyIp(order.customerIp!.trim())}
                    >
                      <ContentCopyRoundedIcon sx={{ fontSize: 15 }} />
                    </IconButton>
                  </Tooltip>
                ) : null}
              </Box>
            }
          />
        ) : null}
        <DetailRow
          label="Customer"
          value={
            <Box sx={{ display: "inline-flex", flexWrap: "wrap", justifyContent: "flex-end", gap: 0.75 }}>
              <span>{order.customerName}</span>
              {ipBlocked ? <BlockedIpBadge /> : null}
              {sameIp ? (
                <SameIpBadge ip={order.customerIp!.trim()} count={sameIpCount} />
              ) : null}
            </Box>
          }
        />

        <Box
          sx={{
            py: 1.25,
            borderBottom: "1px solid",
            borderColor: "rgba(0,0,0,0.06)",
          }}
        >
          <Typography
            sx={{
              fontSize: "0.68rem",
              fontWeight: 700,
              letterSpacing: "0.08em",
              color: "text.secondary",
              textTransform: "uppercase",
            }}
          >
            Phone
          </Typography>
          <Box
            sx={{
              mt: 0.75,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 1,
            }}
          >
            <Typography sx={{ fontSize: "0.9rem", fontWeight: 600 }}>
              {order.customerPhone}
            </Typography>
            <Stack direction="row" spacing={0.5}>
              <Tooltip title="Copy phone">
                <IconButton
                  size="small"
                  aria-label="Copy phone"
                  onClick={() => onCopyPhone(order.customerPhone)}
                  sx={phoneActionSx}
                >
                  <ContentCopyRoundedIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Call">
                <IconButton
                  size="small"
                  component="a"
                  href={phoneToTel(order.customerPhone)}
                  aria-label="Call customer"
                  sx={{ ...phoneActionSx, color: "#16a34a", borderColor: "#bbf7d0" }}
                >
                  <PhoneOutlinedIcon sx={{ fontSize: 17 }} />
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
                  sx={{ ...phoneActionSx, color: "#25d366", borderColor: "#bbf7d0" }}
                >
                  <WhatsAppIcon sx={{ fontSize: 17 }} />
                </IconButton>
              </Tooltip>
              <Tooltip title="View order">
                <IconButton
                  size="small"
                  aria-label="View order"
                  onClick={onView}
                  sx={{ ...phoneActionSx, color: "#ea580c", borderColor: "#fed7aa" }}
                >
                  <LaunchOutlinedIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
            </Stack>
          </Box>
        </Box>

        <DetailRow label="Total" value={formatBdt(order.total)} valueSx={{ fontWeight: 700 }} />
        <DetailRow
          label="Items"
          value={
            order.itemCount > 1
              ? `${order.itemsSummary} (${order.itemCount} items)`
              : order.itemsSummary
          }
          valueSx={{ fontWeight: 500, fontSize: "0.8rem" }}
        />
      </Box>

      <Box
        sx={{
          px: 1.5,
          py: 1.25,
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          flexWrap: "wrap",
          gap: 0.75,
          bgcolor: "#fafafa",
          borderTop: "1px solid",
          borderColor: "rgba(0,0,0,0.06)",
        }}
      >
        <Tooltip title="Order note">
          <IconButton size="small" aria-label="Order note" sx={footerActionSx}>
            <DescriptionOutlinedIcon sx={{ fontSize: 18, color: ADMIN_ACCENT }} />
          </IconButton>
        </Tooltip>
        <Tooltip title="Tags">
          <IconButton size="small" aria-label="Tags" sx={footerActionSx}>
            <SellOutlinedIcon sx={{ fontSize: 18, color: "#16a34a" }} />
          </IconButton>
        </Tooltip>
        {sentToSteadfast ? (
          <SteadfastConsignmentBadge
            consignmentId={order.steadfastConsignmentId!}
            compact
            onCopied={onCopyConsignment}
          />
        ) : (
          <Tooltip title="Send to Steadfast courier">
            <span>
              <IconButton
                size="small"
                aria-label="Send to courier"
                disabled={courierDisabled}
                onClick={onSendToCourier}
                sx={{
                  ...footerActionSx,
                  color: "#7c3aed",
                  borderColor: "#ddd6fe",
                }}
              >
                <LocalShippingOutlinedIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </span>
          </Tooltip>
        )}
        <Tooltip title="View">
          <IconButton
            size="small"
            aria-label="View order"
            onClick={onView}
            sx={footerActionSx}
          >
            <VisibilityOutlinedIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>
        <Tooltip title="Edit">
          <IconButton
            size="small"
            aria-label="Edit order"
            onClick={onEdit}
            sx={{ ...footerActionSx, color: ADMIN_ACCENT }}
          >
            <EditOutlinedIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>
        <Tooltip title="Delete">
          <IconButton
            size="small"
            aria-label="Delete order"
            onClick={onDelete}
            sx={{ ...footerActionSx, color: "#dc2626", borderColor: "#fecaca" }}
          >
            <DeleteOutlineRoundedIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
}
