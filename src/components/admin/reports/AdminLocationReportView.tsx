"use client";

import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import {
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { useMemo, type ReactNode } from "react";
import { useToast } from "@/context/toast/ToastProvider";
import { ADMIN_ACCENT } from "@/lib/constants/admin";
import {
  buildLocationReport,
  topLocationAdsNames,
  type DistrictLocationRow,
  type DivisionLocationRow,
} from "@/lib/reports/location-report";
import type { AdminOrder } from "@/types/admin-order";

function formatBdt(value: number) {
  return `৳${Math.round(value).toLocaleString("en-BD")}`;
}

function formatShare(value: number) {
  return `${value.toFixed(1)}%`;
}

export function AdminLocationReportView({ orders }: { orders: AdminOrder[] }) {
  const { showToast } = useToast();
  const report = useMemo(() => buildLocationReport(orders), [orders]);
  const topDistricts = report.districts.slice(0, 8);
  const maxDistrictOrders = topDistricts[0]?.orders ?? 1;

  async function copyTopLocations() {
    const names = topLocationAdsNames(report, 10);
    if (!names.length) {
      showToast("No matched locations to copy", "error");
      return;
    }
    try {
      await navigator.clipboard.writeText(names.join(", "));
      showToast("Top locations copied");
    } catch {
      showToast("Could not copy locations", "error");
    }
  }

  return (
    <Box sx={{ width: "100%", minWidth: 0 }}>
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
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
            Reports
          </Typography>
          <Typography
            sx={{
              mt: 0.5,
              fontSize: { xs: "1.45rem", sm: "1.7rem" },
              fontWeight: 700,
              letterSpacing: "-0.03em",
            }}
          >
            Location report
          </Typography>
          <Typography sx={{ mt: 0.75, maxWidth: 640, fontSize: "0.92rem", color: "text.secondary" }}>
            Districts and divisions taken from order addresses. Copy the ad names into Meta or
            TikTok. Cancelled orders are excluded. Chattogram, Cumilla, and Barishal are written as
            Chittagong, Comilla, and Barisal.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<ContentCopyRoundedIcon />}
          onClick={() => void copyTopLocations()}
          sx={{
            alignSelf: { xs: "flex-start", md: "center" },
            textTransform: "none",
            fontWeight: 700,
            bgcolor: "#20312d",
            borderRadius: 1,
            px: 2,
            "&:hover": { bgcolor: "#162420" },
          }}
        >
          Copy top locations
        </Button>
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr 1fr", lg: "repeat(4, 1fr)" },
          border: "1px solid rgba(32,49,45,0.12)",
          borderRadius: 1,
          overflow: "hidden",
          bgcolor: "#fff",
          mb: 2.5,
        }}
      >
        <Metric label="Active orders" value={String(report.activeOrders)} />
        <Metric label="Matched" value={String(report.matchedOrders)} />
        <Metric label="Unmatched" value={String(report.unmatchedOrders)} />
        <Metric label="Match rate" value={formatShare(report.matchRate)} />
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", lg: "1.4fr 0.8fr" },
          gap: 2,
          mb: 2.5,
        }}
      >
        <Panel title="Top districts" hint="By order count">
          {topDistricts.length === 0 ? (
            <EmptyLine />
          ) : (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.35 }}>
              {topDistricts.map((row) => (
                <DistrictMeter key={row.district} row={row} max={maxDistrictOrders} />
              ))}
            </Box>
          )}
        </Panel>

        <Panel title="Divisions" hint="Share of matched orders">
          {report.divisions.length === 0 ? (
            <EmptyLine />
          ) : (
            <Box sx={{ display: "flex", flexDirection: "column" }}>
              {report.divisions.map((row, index) => (
                <DivisionLine key={row.division} row={row} index={index} />
              ))}
            </Box>
          )}
        </Panel>
      </Box>

      <Box
        sx={{
          border: "1px solid rgba(32,49,45,0.12)",
          borderRadius: 1,
          overflow: "hidden",
          bgcolor: "#fff",
        }}
      >
        <Box sx={{ px: 2, py: 1.5, borderBottom: "1px solid rgba(32,49,45,0.08)" }}>
          <Typography sx={{ fontWeight: 700 }}>All matched districts</Typography>
          <Typography sx={{ fontSize: "0.8rem", color: "text.secondary" }}>
            Ad name is the label to paste into Facebook and TikTok location targeting.
          </Typography>
        </Box>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                {["#", "District", "Ad name", "Division", "Orders", "Share", "Revenue"].map(
                  (heading) => (
                    <TableCell
                      key={heading}
                      align={["Orders", "Share", "Revenue"].includes(heading) ? "right" : "left"}
                      sx={{
                        fontSize: "0.68rem",
                        fontWeight: 700,
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                        color: "text.secondary",
                        bgcolor: "#f7f6f3",
                      }}
                    >
                      {heading}
                    </TableCell>
                  ),
                )}
              </TableRow>
            </TableHead>
            <TableBody>
              {report.districts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} sx={{ py: 5, textAlign: "center", color: "text.secondary" }}>
                    No district could be read from the current orders.
                  </TableCell>
                </TableRow>
              ) : (
                report.districts.map((row, index) => (
                  <TableRow key={row.district} hover>
                    <TableCell sx={{ color: "text.secondary" }}>{index + 1}</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>{row.district}</TableCell>
                    <TableCell>{row.adsName}</TableCell>
                    <TableCell>{row.division}</TableCell>
                    <TableCell align="right">{row.orders}</TableCell>
                    <TableCell align="right">{formatShare(row.share)}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>
                      {formatBdt(row.revenue)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </Box>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Box
      sx={{
        px: 2,
        py: 1.75,
        borderRight: { lg: "1px solid rgba(32,49,45,0.08)" },
        borderBottom: { xs: "1px solid rgba(32,49,45,0.08)", lg: "none" },
        "&:nth-of-type(2n)": { borderRight: { xs: "none", lg: "1px solid rgba(32,49,45,0.08)" } },
        "&:nth-of-type(4)": { borderRight: "none", borderBottom: "none" },
      }}
    >
      <Typography
        sx={{
          fontSize: "0.68rem",
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "text.secondary",
        }}
      >
        {label}
      </Typography>
      <Typography sx={{ mt: 0.4, fontSize: "1.55rem", fontWeight: 700, letterSpacing: "-0.03em" }}>
        {value}
      </Typography>
    </Box>
  );
}

function Panel({
  title,
  hint,
  children,
}: {
  title: string;
  hint: string;
  children: ReactNode;
}) {
  return (
    <Box
      sx={{
        border: "1px solid rgba(32,49,45,0.12)",
        borderRadius: 1,
        bgcolor: "#fff",
        p: 2,
      }}
    >
      <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1, mb: 1.75 }}>
        <Typography sx={{ fontWeight: 700 }}>{title}</Typography>
        <Typography sx={{ fontSize: "0.75rem", color: "text.secondary" }}>{hint}</Typography>
      </Box>
      {children}
    </Box>
  );
}

function DistrictMeter({ row, max }: { row: DistrictLocationRow; max: number }) {
  const width = `${Math.max(6, (row.orders / max) * 100)}%`;
  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1, mb: 0.45 }}>
        <Typography sx={{ fontSize: "0.86rem", fontWeight: 600 }}>
          {row.district}
          <Typography component="span" sx={{ ml: 0.75, fontSize: "0.75rem", color: "text.secondary" }}>
            {row.adsName === row.district ? row.division : row.adsName}
          </Typography>
        </Typography>
        <Typography sx={{ fontSize: "0.8rem", fontWeight: 700 }}>
          {row.orders}
          <Typography component="span" sx={{ ml: 0.6, fontWeight: 500, color: "text.secondary" }}>
            {formatShare(row.share)}
          </Typography>
        </Typography>
      </Box>
      <Box sx={{ height: 6, borderRadius: 99, bgcolor: "rgba(32,49,45,0.08)" }}>
        <Box sx={{ width, height: "100%", borderRadius: 99, bgcolor: ADMIN_ACCENT }} />
      </Box>
    </Box>
  );
}

function DivisionLine({ row, index }: { row: DivisionLocationRow; index: number }) {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: "16px 1fr auto",
        gap: 1.25,
        alignItems: "center",
        py: 0.9,
        borderTop: index === 0 ? "none" : "1px solid rgba(32,49,45,0.08)",
      }}
    >
      <Typography sx={{ fontSize: "0.75rem", color: "text.secondary" }}>{index + 1}</Typography>
      <Box>
        <Typography sx={{ fontSize: "0.88rem", fontWeight: 600 }}>{row.division}</Typography>
        <Box sx={{ mt: 0.45, height: 4, borderRadius: 99, bgcolor: "rgba(32,49,45,0.08)" }}>
          <Box
            sx={{
              width: `${Math.max(4, row.share)}%`,
              height: "100%",
              borderRadius: 99,
              bgcolor: "#20312d",
            }}
          />
        </Box>
      </Box>
      <Typography sx={{ fontSize: "0.8rem", fontWeight: 700, textAlign: "right" }}>
        {row.orders}
        <Typography component="span" sx={{ display: "block", fontWeight: 500, color: "text.secondary" }}>
          {formatShare(row.share)}
        </Typography>
      </Typography>
    </Box>
  );
}

function EmptyLine() {
  return (
    <Typography sx={{ py: 2, fontSize: "0.875rem", color: "text.secondary" }}>
      No matched locations yet.
    </Typography>
  );
}
