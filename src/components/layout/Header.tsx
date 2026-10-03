"use client";

import FavoriteBorderRoundedIcon from "@mui/icons-material/FavoriteBorderRounded";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import ShoppingBagOutlinedIcon from "@mui/icons-material/ShoppingBagOutlined";
import {
  AppBar,
  Badge,
  Box,
  Button,
  IconButton,
  Toolbar,
  Typography,
} from "@mui/material";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Container } from "@/components/container";
import { MobileNav } from "@/components/layout/MobileNav";
import { useCart } from "@/hooks/useCart";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { useStoreCategories } from "@/hooks/useStoreCategories";
import { useWishlist } from "@/hooks/useWishlist";
import { buildMainNav } from "@/lib/constants/navigation";
import { useCartUI } from "@/providers/CartUIProvider";

const iconBtnSx = {
  border: "1px solid",
  borderColor: "divider",
  borderRadius: 1,
} as const;

const badgeSx = {
  "& .MuiBadge-badge": {
    borderRadius: 1,
    fontWeight: 700,
    minWidth: 18,
    height: 18,
    fontSize: "0.65rem",
  },
} as const;

export function Header() {
  const pathname = usePathname();
  const settings = useSiteSettings();
  const categories = useStoreCategories();
  const mainNav = buildMainNav(categories);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { openCart, openWishlist } = useCartUI();
  const { itemCount } = useCart();
  const { count: wishlistCount } = useWishlist();

  return (
    <>
      <AppBar
        position="sticky"
        color="transparent"
        elevation={0}
        sx={{
          top: 0,
          zIndex: (theme) => theme.zIndex.appBar,
          borderBottom: "1px solid",
          borderColor: "divider",
          bgcolor: "rgba(255, 253, 248, 0.88)",
          backdropFilter: "blur(14px)",
        }}
      >
        <Container>
          <Toolbar
            disableGutters
            sx={{
              minHeight: { xs: 64, md: 72 },
              gap: 1,
              justifyContent: "space-between",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, minWidth: 0 }}>
              <IconButton
                aria-label="Open menu"
                onClick={() => setMobileOpen(true)}
                sx={{
                  display: { xs: "inline-flex", md: "none" },
                  ...iconBtnSx,
                }}
              >
                <MenuRoundedIcon />
              </IconButton>

              <Typography
                component={Link}
                href="/"
                variant="h6"
                sx={{
                  fontWeight: 700,
                  letterSpacing: "-0.04em",
                  color: "text.primary",
                  textDecoration: "none",
                  fontSize: { xs: "1.05rem", sm: "1.2rem" },
                  whiteSpace: "nowrap",
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                }}
              >
                {settings.logoUrl ? (
                  <Box
                    component="img"
                    src={settings.logoUrl}
                    alt=""
                    sx={{ height: 40, width: 40, objectFit: "contain", display: "block" }}
                  />
                ) : null}
                {settings.shopName}
              </Typography>
            </Box>

            <Box
              component="nav"
              sx={{
                display: { xs: "none", md: "flex" },
                alignItems: "center",
                gap: 0.5,
              }}
            >
              {mainNav.map((item) => {
                const hasDeeperMatch = mainNav.some(
                  (other) =>
                    other.href !== item.href &&
                    other.href.startsWith(`${item.href}/`) &&
                    (pathname === other.href || pathname.startsWith(`${other.href}/`)),
                );
                const active =
                  !hasDeeperMatch &&
                  (pathname === item.href || pathname.startsWith(`${item.href}/`));

                return (
                  <Button
                    key={item.href}
                    component={Link}
                    href={item.href}
                    color="inherit"
                    sx={{
                      borderRadius: 1,
                      px: 1.5,
                      minWidth: 0,
                      color: active ? "primary.main" : "text.primary",
                      bgcolor: active ? "rgba(31, 111, 91, 0.08)" : "transparent",
                      "&:hover": {
                        bgcolor: "rgba(31, 111, 91, 0.1)",
                      },
                    }}
                  >
                    {item.label}
                  </Button>
                );
              })}
            </Box>

            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
              <IconButton
                aria-label="Open wishlist"
                onClick={openWishlist}
                sx={iconBtnSx}
              >
                <Badge badgeContent={wishlistCount} color="primary" max={99} sx={badgeSx}>
                  <FavoriteBorderRoundedIcon />
                </Badge>
              </IconButton>

              <IconButton aria-label="Open cart" onClick={openCart} sx={iconBtnSx}>
                <Badge badgeContent={itemCount} color="primary" max={99} sx={badgeSx}>
                  <ShoppingBagOutlinedIcon />
                </Badge>
              </IconButton>
            </Box>
          </Toolbar>
        </Container>
      </AppBar>

      <MobileNav open={mobileOpen} onClose={() => setMobileOpen(false)} />
    </>
  );
}
