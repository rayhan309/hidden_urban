"use client";

import FavoriteBorderRoundedIcon from "@mui/icons-material/FavoriteBorderRounded";
import FavoriteRoundedIcon from "@mui/icons-material/FavoriteRounded";
import ShoppingBagOutlinedIcon from "@mui/icons-material/ShoppingBagOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/hooks/useCart";
import { useWishlist } from "@/hooks/useWishlist";
import { formatCurrency } from "@/lib/formatters/currency";
import { displayImageUrl } from "@/lib/images/display-url";
import { useCartUI } from "@/providers/CartUIProvider";
import type { Product } from "@/types/product";

const QuickViewDialog = dynamic(
  () => import("@/components/product/QuickViewDialog").then((mod) => mod.QuickViewDialog),
  { ssr: false },
);

type CollectionProductCardProps = {
  product: Product;
};

const actionBtnClass =
  "flex h-6 w-6 items-center justify-center rounded-md border border-[rgba(32,49,45,0.1)] bg-white text-[#20312d] shadow-sm transition-colors hover:border-[#1f6f5b] hover:bg-[#1f6f5b] hover:text-white sm:h-7 sm:w-7 md:h-8 md:w-8";

const actionIconSx = { fontSize: { xs: 12, sm: 14, md: 15 } };
export function CollectionProductCard({ product }: CollectionProductCardProps) {
  const [quickViewOpen, setQuickViewOpen] = useState(false);
  const { addItem } = useCart();
  const { openCart } = useCartUI();
  const { isWishlisted, toggleWishlist } = useWishlist();
  const wishlisted = isWishlisted(product.id);
  const image = product.images[0];
  const href = `/shop/${product.category_slug}/${product.slug}`;

  function handleAddToCart() {
    const contentId = (product.id || product.slug || "").trim();
    addItem({
      productId: product.id,
      slug: product.slug,
      name: product.title,
      price: product.pricing.price,
      compareAtPrice: product.pricing.compareAtPrice,
      currency: product.pricing.currency,
      size: product.attributes.sizes[1] ?? product.attributes.sizes[0] ?? "M",
      color: product.attributes.colors[0] ?? "Default",
      image: image?.url ?? "",
    });
    openCart();
    if (!contentId) return;
    void import("@/lib/pixel/track").then(({ trackPixelEvent }) => {
      void trackPixelEvent({
        eventName: "AddToCart",
        value: product.pricing.price,
        currency: product.pricing.currency,
        contentIds: [contentId],
        contents: [{ id: contentId, quantity: 1, item_price: product.pricing.price }],
        contentType: "product",
        contentName: product.title,
        numItems: 1,
      });
    });
  }

  return (
    <>
      <article className="group flex h-full flex-col">
        <div className="relative w-full overflow-hidden rounded-md bg-[#f0ebe3]">
          <Link href={href} className="relative block w-full">
            {image ? (
              <Image
                src={displayImageUrl(image.url, 640)}
                alt={image.alt}
                width={800}
                height={1000}
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                unoptimized
                className="!h-auto !w-full !max-w-full object-contain transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                style={{ width: "100%", height: "auto" }}
              />
            ) : (
              <div className="aspect-[4/5] w-full bg-[#e8e2d8]" />
            )}
          </Link>

          {product.pricing.compareAtPrice ? (
            <span className="absolute top-2 left-2 z-10 rounded-md bg-[#1f6f5b] px-2 py-1 text-[11px] font-bold tracking-wide text-white uppercase sm:top-3 sm:left-3">
              Sale
            </span>
          ) : null}

          <div className="absolute top-1.5 right-1.5 z-10 flex translate-y-0 flex-col gap-1 opacity-100 transition-all duration-300 ease-out sm:top-2 sm:right-2 sm:gap-1.5 md:pointer-events-none md:translate-y-2 md:opacity-0 md:group-hover:pointer-events-auto md:group-hover:translate-y-0 md:group-hover:opacity-100">
            <button
              type="button"
              aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
              onClick={() => toggleWishlist(product.id)}
              className={`${actionBtnClass} ${wishlisted ? "border-[#1f6f5b] text-[#1f6f5b]" : ""}`}
            >
              {wishlisted ? (
                <FavoriteRoundedIcon sx={actionIconSx} />
              ) : (
                <FavoriteBorderRoundedIcon sx={actionIconSx} />
              )}
            </button>

            <button
              type="button"
              aria-label={`Quick view ${product.title}`}
              onClick={() => setQuickViewOpen(true)}
              className={actionBtnClass}
            >
              <VisibilityOutlinedIcon sx={actionIconSx} />
            </button>

            <button
              type="button"
              aria-label={`Add ${product.title} to cart`}
              onClick={handleAddToCart}
              className={actionBtnClass}
            >
              <ShoppingBagOutlinedIcon sx={actionIconSx} />
            </button>
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-1 pt-3">
          <p className="text-xs font-semibold tracking-[0.12em] text-[#61716a] uppercase">
            {product.brand_or_vendor}
          </p>
          <Link
            href={href}
            className="text-sm font-bold text-[#20312d] transition-colors hover:text-[#1f6f5b] sm:text-base"
          >
            {product.title}
          </Link>
          <div className="mt-auto flex items-center gap-2 pt-1">
            <span className="text-sm font-bold text-[#20312d]">
              {formatCurrency(product.pricing.price, product.pricing.currency)}
            </span>
            {product.pricing.compareAtPrice ? (
              <span className="text-xs text-[#61716a] line-through">
                {formatCurrency(product.pricing.compareAtPrice, product.pricing.currency)}
              </span>
            ) : null}
          </div>
        </div>
      </article>

      {quickViewOpen ? (
        <QuickViewDialog
          product={product}
          open
          onClose={() => setQuickViewOpen(false)}
          onAddToCart={() => {
            handleAddToCart();
            setQuickViewOpen(false);
          }}
          onToggleWishlist={() => toggleWishlist(product.id)}
          isWishlisted={wishlisted}
        />
      ) : null}
    </>
  );
}
