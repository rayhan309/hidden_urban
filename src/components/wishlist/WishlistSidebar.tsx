"use client";

import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import FavoriteBorderRoundedIcon from "@mui/icons-material/FavoriteBorderRounded";
import ShoppingBagOutlinedIcon from "@mui/icons-material/ShoppingBagOutlined";
import {
  Box,
  Button,
  Divider,
  Drawer,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/hooks/useCart";
import { useWishlist } from "@/hooks/useWishlist";
import { formatCurrency } from "@/lib/formatters/currency";
import { displayImageUrl } from "@/lib/images/display-url";
import { queryKeys } from "@/lib/queries/query-keys";
import { useCartUI } from "@/providers/CartUIProvider";
import { fetchStoreProducts } from "@/services/store-queries";
import type { Product } from "@/types/product";

export function WishlistSidebar() {
  const { isWishlistOpen, closeWishlist, openCart } = useCartUI();
  const { productIds, toggleWishlist } = useWishlist();
  const { addItem } = useCart();
  const shouldLoad = isWishlistOpen && productIds.length > 0;
  const { data: products = [], isPending, isError } = useQuery({
    queryKey: queryKeys.store.products(),
    queryFn: fetchStoreProducts,
    enabled: shouldLoad,
  });

  const items = products.filter((product) => productIds.includes(product.id));
  const isLoading = shouldLoad && isPending;
  const isEmpty = !isLoading && items.length === 0;

  function moveToCart(product: Product) {
    const image = product.images[0]?.url ?? "";
    addItem({
      productId: product.id,
      slug: product.slug,
      name: product.title,
      price: product.pricing.price,
      compareAtPrice: product.pricing.compareAtPrice,
      currency: product.pricing.currency,
      quantity: 1,
      size: product.attributes.sizes[0] ?? "M",
      color: product.attributes.colors[0] ?? "Default",
      image,
    });
    toggleWishlist(product.id);
    void import("@/lib/pixel/track").then(({ trackPixelEvent }) => {
      void trackPixelEvent({
        eventName: "AddToCart",
        value: product.pricing.price,
        currency: product.pricing.currency,
        contentIds: [product.id],
        contents: [{ id: product.id, quantity: 1, item_price: product.pricing.price }],
        contentName: product.title,
        numItems: 1,
      });
    });
    closeWishlist();
    openCart();
  }

  return (
    <Drawer
      anchor="right"
      open={isWishlistOpen}
      onClose={closeWishlist}
      slotProps={{
        paper: {
          sx: {
            width: { xs: "100%", sm: 420 },
            maxWidth: "100vw",
            bgcolor: "background.paper",
            display: "flex",
            flexDirection: "column",
          },
        },
      }}
    >
      <Stack
        direction="row"
        sx={{
          alignItems: "center",
          justifyContent: "space-between",
          px: 2.5,
          py: 2,
          borderBottom: "1px solid",
          borderColor: "divider",
        }}
      >
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700, letterSpacing: "-0.02em" }}>
            Wishlist
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {productIds.length} {productIds.length === 1 ? "item" : "items"}
          </Typography>
        </Box>
        <IconButton
          aria-label="Close wishlist"
          onClick={closeWishlist}
          sx={{
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 1,
            width: { xs: 32, sm: 40 },
            height: { xs: 32, sm: 40 },
          }}
        >
          <CloseRoundedIcon sx={{ fontSize: { xs: 16, sm: 20 } }} />
        </IconButton>
      </Stack>

      <Box sx={{ flex: 1, overflowY: "auto", px: 2.5 }}>
        {isLoading ? (
          <Stack sx={{ minHeight: 280, alignItems: "center", justifyContent: "center", py: 6 }}>
            <Typography variant="body2" color="text.secondary">
              Loading wishlist…
            </Typography>
          </Stack>
        ) : isError ? (
          <Stack sx={{ minHeight: 280, alignItems: "center", justifyContent: "center", py: 6 }}>
            <Typography variant="body2" color="text.secondary">
              Couldn&apos;t load saved products. Try again in a moment.
            </Typography>
          </Stack>
        ) : isEmpty ? (
          <Stack
            sx={{
              height: "100%",
              minHeight: 280,
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              gap: 1.5,
              py: 6,
            }}
          >
            <Box
              sx={{
                width: { xs: 52, sm: 64 },
                height: { xs: 52, sm: 64 },
                borderRadius: 1,
                bgcolor: "rgba(31, 111, 91, 0.08)",
                display: "grid",
                placeItems: "center",
                mb: 1,
              }}
            >
              <FavoriteBorderRoundedIcon
                color="primary"
                sx={{ fontSize: { xs: 22, sm: 28 } }}
              />
            </Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              Your wishlist is empty
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 240 }}>
              Tap the heart on any product to save it here.
            </Typography>
            <Button
              component={Link}
              href="/shop"
              variant="contained"
              onClick={closeWishlist}
              sx={{ mt: 1, borderRadius: 1 }}
            >
              Browse shop
            </Button>
          </Stack>
        ) : (
          <Stack divider={<Divider />} sx={{ py: 1 }}>
            {items.map((product) => {
              const image = product.images[0];
              const href = `/shop/${product.category_slug}/${product.slug}`;
              return (
                <Stack
                  key={product.id}
                  direction="row"
                  spacing={1.5}
                  sx={{ py: 2, alignItems: "flex-start" }}
                >
                  <Box
                    component={Link}
                    href={href}
                    onClick={closeWishlist}
                    sx={{
                      position: "relative",
                      width: 88,
                      height: 110,
                      flexShrink: 0,
                      borderRadius: 1,
                      overflow: "hidden",
                      bgcolor: "#f0ebe3",
                    }}
                  >
                    {image?.url ? (
                      <Image
                        src={displayImageUrl(image.url, 200)}
                        alt={image.alt || product.title}
                        fill
                        sizes="88px"
                        className="object-cover"
                      />
                    ) : null}
                  </Box>

                  <Stack sx={{ flex: 1, minWidth: 0, gap: 0.75 }}>
                    <Typography
                      component={Link}
                      href={href}
                      onClick={closeWishlist}
                      variant="subtitle2"
                      sx={{
                        fontWeight: 700,
                        color: "text.primary",
                        textDecoration: "none",
                        "&:hover": { color: "primary.main" },
                      }}
                    >
                      {product.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {formatCurrency(product.pricing.price, product.pricing.currency)}
                      {product.pricing.compareAtPrice ? (
                        <Box
                          component="span"
                          sx={{
                            ml: 1,
                            textDecoration: "line-through",
                            color: "text.disabled",
                            fontSize: "0.8rem",
                          }}
                        >
                          {formatCurrency(
                            product.pricing.compareAtPrice,
                            product.pricing.currency,
                          )}
                        </Box>
                      ) : null}
                    </Typography>

                    <Stack direction="row" spacing={1} sx={{ pt: 0.5 }}>
                      <Button
                        size="small"
                        variant="contained"
                        startIcon={<ShoppingBagOutlinedIcon sx={{ fontSize: 16 }} />}
                        onClick={() => moveToCart(product)}
                        sx={{
                          borderRadius: 1,
                          textTransform: "none",
                          fontWeight: 600,
                          flex: 1,
                          py: 0.75,
                        }}
                      >
                        Move to cart
                      </Button>
                      <IconButton
                        aria-label={`Remove ${product.title} from wishlist`}
                        onClick={() => toggleWishlist(product.id)}
                        size="small"
                        sx={{
                          border: "1px solid",
                          borderColor: "divider",
                          borderRadius: 1,
                        }}
                      >
                        <DeleteOutlineRoundedIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  </Stack>
                </Stack>
              );
            })}
          </Stack>
        )}
      </Box>

      {!isEmpty ? (
        <Box
          sx={{
            borderTop: "1px solid",
            borderColor: "divider",
            p: 2.5,
            bgcolor: "background.default",
          }}
        >
          <Button
            component={Link}
            href="/shop"
            variant="outlined"
            size="large"
            fullWidth
            onClick={closeWishlist}
            sx={{ borderRadius: 1 }}
          >
            Continue shopping
          </Button>
        </Box>
      ) : null}
    </Drawer>
  );
}
