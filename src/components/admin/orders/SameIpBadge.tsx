import { Box, Tooltip } from "@mui/material";

type SameIpBadgeProps = {
  ip: string;
  count: number;
};

export function SameIpBadge({ ip, count }: SameIpBadgeProps) {
  return (
    <Tooltip title={`${count} orders from ${ip}`}>
      <Box
        component="span"
        sx={{
          display: "inline-flex",
          alignItems: "center",
          px: 0.9,
          py: 0.15,
          borderRadius: 999,
          border: "1px solid #fbbf24",
          bgcolor: "#fffbeb",
          color: "#b45309",
          fontSize: "0.65rem",
          fontWeight: 700,
          lineHeight: 1.4,
          whiteSpace: "nowrap",
        }}
      >
        Same IP
      </Box>
    </Tooltip>
  );
}

export function BlockedIpBadge() {
  return (
    <Box
      component="span"
      sx={{
        display: "inline-flex",
        alignItems: "center",
        px: 0.9,
        py: 0.15,
        borderRadius: 999,
        border: "1px solid #fca5a5",
        bgcolor: "#fef2f2",
        color: "#b91c1c",
        fontSize: "0.65rem",
        fontWeight: 700,
        lineHeight: 1.4,
        whiteSpace: "nowrap",
      }}
    >
      Blocked IP
    </Box>
  );
}
