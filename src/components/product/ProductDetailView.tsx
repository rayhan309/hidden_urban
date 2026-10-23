"use client";

import CheckroomOutlinedIcon from "@mui/icons-material/CheckroomOutlined";
import FavoriteBorderRoundedIcon from "@mui/icons-material/FavoriteBorderRounded";
import FavoriteRoundedIcon from "@mui/icons-material/FavoriteRounded";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import PhoneOutlinedIcon from "@mui/icons-material/PhoneOutlined";
import RemoveRoundedIcon from "@mui/icons-material/RemoveRounded";
import SecurityOutlinedIcon from "@mui/icons-material/SecurityOutlined";
import ShareOutlinedIcon from "@mui/icons-material/ShareOutlined";
import ShoppingBagOutlinedIcon from "@mui/icons-material/ShoppingBagOutlined";
import VerifiedOutlinedIcon from "@mui/icons-material/VerifiedOutlined";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { CollectionProductCard } from "@/components/product/CollectionProductCard";
import { StarIcon } from "@/components/ui/StarIcon";
import { useCart } from "@/hooks/useCart";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { useWishlist } from "@/hooks/useWishlist";
import { formatCurrency } from "@/lib/formatters/currency";
import { useCartUI } from "@/providers/CartUIProvider";
import type { Product, ProductSize } from "@/types/product";

type ProductDetailViewProps = {
  product: Product;
  relatedProducts: Product[];
};

const trustItems = [
  { icon: LocalShippingOutlinedIcon, label: "Fast delivery" },
  { icon: SecurityOutlinedIcon, label: "Secure checkout" },
  { icon: VerifiedOutlinedIcon, label: "Quality products" },
] as const;

function discountBadge(product: Product): string | null {
  if (product.pricing.discountPercent > 0) {
    return `-${product.pricing.discountPercent}%`;
  }
  const compare = product.pricing.compareAtPrice;
  if (compare && compare > product.pricing.price) {
    const pct = Math.round((1 - product.pricing.price / compare) * 100);
    return pct > 0 ? `-${pct}%` : null;
  }
  return null;
}

function whatsAppNumber(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("880")) return digits;
  if (digits.startsWith("0")) return `88${digits}`;
  return digits;
}

function phoneTelHref(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("880")) return `tel:+${digits}`;
  if (digits.startsWith("0")) return `tel:+88${digits}`;
  return `tel:${phone}`;
}

export function ProductDetailView({ product, relatedProducts }: ProductDetailViewProps) {
  const router = useRouter();
  const settings = useSiteSettings();
  const { addItem } = useCart();
  const { openCart } = useCartUI();
  const { isWishlisted, toggleWishlist } = useWishlist();

  const images = product.images.length > 0 ? product.images : [{ url: "", alt: product.title }];
  const [activeImage, setActiveImage] = useState(0);
  const sizes = product.attributes.sizes;
  const colors =
    product.attributes.colors.length > 0 ? product.attributes.colors : ["Default"];
  const [selectedSize, setSelectedSize] = useState<ProductSize>(sizes[0] ?? "M");
  const [selectedColor, setSelectedColor] = useState(colors[0]);
  const [quantity, setQuantity] = useState(1);
  const [shareHint, setShareHint] = useState<string | null>(null);

  const wishlisted = isWishlisted(product.id);
  const badge = discountBadge(product);
  const maxQty = Math.max(1, product.inventory.quantity || 99);
  const inStock = product.inventory.inStock && product.inventory.quantity > 0;
  const viewTracked = useRef(false);

  useEffect(() => {
    if (viewTracked.current) return;
    viewTracked.current = true;
    const contentId = (product.id || product.slug || "").trim();
    if (!contentId) return;
    void import("@/lib/pixel/track").then(({ trackPixelEvent }) => {
      void trackPixelEvent({
        eventName: "ViewContent",
        value: product.pricing.price,
        currency: product.pricing.currency,
        contentIds: [contentId],
        contents: [{ id: contentId, quantity: 1, item_price: product.pricing.price }],
        contentType: "product",
        contentName: product.title,
      });
    });
  }, [product.id, product.slug, product.pricing.price, product.pricing.currency, product.title]);

  const whatsAppHref = useMemo(() => {
    const num = whatsAppNumber(settings.contactPhone);
    const text = encodeURIComponent(
      `Hi, I'm interested in "${product.title}" (${formatCurrency(product.pricing.price, product.pricing.currency)}).`,
    );
    return `https://wa.me/${num}?text=${text}`;
  }, [product, settings.contactPhone]);

  function buildCartPayload(qty: number) {
    const image = images[activeImage]?.url ?? product.images[0]?.url ?? "";
    return {
      productId: product.id,
      slug: product.slug,
      name: product.title,
      price: product.pricing.price,
      compareAtPrice: product.pricing.compareAtPrice,
      currency: product.pricing.currency,
      quantity: qty,
      size: selectedSize,
      color: selectedColor,
      image,
    };
  }

  function handleAddToCart() {
    const payload = buildCartPayload(quantity);
    addItem(payload);
    openCart();
    const contentId = (product.id || product.slug || "").trim();
    if (!contentId) return;
    void import("@/lib/pixel/track").then(({ trackPixelEvent }) => {
      void trackPixelEvent({
        eventName: "AddToCart",
        value: product.pricing.price * quantity,
        currency: product.pricing.currency,
        contentIds: [contentId],
        contents: [{ id: contentId, quantity, item_price: product.pricing.price }],
        contentType: "product",
        contentName: product.title,
        numItems: quantity,
      });
    });
  }

  function handleBuyNow() {
    const payload = buildCartPayload(quantity);
    addItem(payload);
    const contentId = (product.id || product.slug || "").trim();
    if (contentId) {
      void import("@/lib/pixel/track").then(({ trackPixelEvent }) => {
        void trackPixelEvent({
          eventName: "AddToCart",
          value: product.pricing.price * quantity,
          currency: product.pricing.currency,
          contentIds: [contentId],
          contents: [{ id: contentId, quantity, item_price: product.pricing.price }],
          contentType: "product",
          contentName: product.title,
          numItems: quantity,
        });
      });
    }
    router.push("/checkout");
  }

  async function handleShare() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    try {
      if (navigator.share) {
        await navigator.share({ title: product.title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setShareHint("Link copied");
    } catch {
      setShareHint(null);
    }
    window.setTimeout(() => setShareHint(null), 2500);
  }

  return (
    <div className="flex flex-col gap-10 md:gap-14">
      <nav className="text-sm text-[#61716a]" aria-label="Breadcrumb">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link href="/" className="hover:text-[var(--eco-primary)]">
              Home
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li>
            <Link href="/shop" className="hover:text-[var(--eco-primary)]">
              Shop
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li>
            <Link
              href={`/shop/${product.category_slug}`}
              className="hover:text-[var(--eco-primary)]"
            >
              {product.category}
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li className="font-medium text-[#20312d]">{product.title}</li>
        </ol>
      </nav>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-12 xl:gap-16">
        <div className="flex flex-col gap-4">
          <div className="relative overflow-hidden rounded-lg border border-[rgba(32,49,45,0.08)] bg-[#f6f3ed]">
            <div className="relative w-full">
              {images[activeImage]?.url ? (
                <Image
                  src={images[activeImage].url}
                  alt={images[activeImage].alt || product.title}
                  width={1200}
                  height={1500}
                  priority
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="!h-auto !w-full !max-w-full"
                  style={{ width: "100%", height: "auto" }}
                />
              ) : (
                <div className="flex aspect-[4/5] items-center justify-center text-sm text-[#61716a]">
                  No image
                </div>
              )}
            </div>

            {badge ? (
              <span className="absolute top-4 left-4 rounded-md bg-[#c2410c] px-2.5 py-1 text-xs font-bold tracking-wide text-white uppercase">
                {badge} off
              </span>
            ) : null}

            <div className="absolute top-4 right-4 flex flex-col gap-2">
              <button
                type="button"
                aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
                onClick={() => toggleWishlist(product.id)}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-[rgba(32,49,45,0.1)] bg-white/95 text-[#20312d] shadow-sm transition-colors hover:border-[var(--eco-primary)] hover:text-[var(--eco-primary)]"
              >
                {wishlisted ? (
                  <FavoriteRoundedIcon sx={{ fontSize: 20 }} color="primary" />
                ) : (
                  <FavoriteBorderRoundedIcon sx={{ fontSize: 20 }} />
                )}
              </button>
              <button
                type="button"
                aria-label="Share product"
                onClick={handleShare}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-[rgba(32,49,45,0.1)] bg-white/95 text-[#20312d] shadow-sm transition-colors hover:border-[var(--eco-primary)] hover:text-[var(--eco-primary)]"
              >
                <ShareOutlinedIcon sx={{ fontSize: 20 }} />
              </button>
            </div>
            {shareHint ? (
              <span className="absolute bottom-4 right-4 rounded-md bg-[#20312d] px-2.5 py-1 text-xs font-medium text-white">
                {shareHint}
              </span>
            ) : null}
          </div>

          {images.length > 1 ? (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {images.map((img, index) => (
                <button
                  key={`${img.url}-${index}`}
                  type="button"
                  onClick={() => setActiveImage(index)}
                  className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-md border-2 transition-colors sm:h-20 sm:w-20 ${
                    activeImage === index
                      ? "border-[var(--eco-primary)]"
                      : "border-transparent opacity-80 hover:opacity-100"
                  }`}
                >
                  {img.url ? (
                    <Image
                      src={img.url}
                      alt=""
                      fill
                      sizes="80px"
                      className="object-contain object-center"
                      style={{ objectFit: "contain" }}
                    />
                  ) : null}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-5 lg:py-2">
          <div>
            <Link
              href={`/shop/${product.category_slug}`}
              className="inline-flex rounded-md bg-[var(--eco-primary-soft)] px-2.5 py-1 text-xs font-bold tracking-wide text-[var(--eco-primary)] uppercase"
            >
              {product.category}
            </Link>
            <h1 className="mt-3 text-2xl font-bold tracking-[-0.03em] text-[#20312d] sm:text-3xl lg:text-[2rem]">
              {product.title}
            </h1>
            <p className="mt-1 text-sm text-[#61716a]">{product.brand_or_vendor}</p>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <span className="text-2xl font-bold text-[#20312d] sm:text-3xl">
              {formatCurrency(product.pricing.price, product.pricing.currency)}
            </span>
            {product.pricing.compareAtPrice ? (
              <span className="text-base text-[#61716a] line-through">
                {formatCurrency(product.pricing.compareAtPrice, product.pricing.currency)}
              </span>
            ) : null}
            {product.ratings.count > 0 ? (
              <span className="ml-auto flex items-center gap-1 text-sm text-[#61716a]">
                <StarIcon size={18} color="#d97706" />
                {product.ratings.average.toFixed(1)}
                <span className="text-[#9aa8a1]">({product.ratings.count})</span>
              </span>
            ) : null}
          </div>

          {!inStock ? (
            <p className="rounded-md border border-[#fecaca] bg-[#fef2f2] px-3 py-2 text-sm font-medium text-[#b91c1c]">
              Out of stock — check back soon or message us on WhatsApp.
            </p>
          ) : null}

          {sizes.length > 0 ? (
            <div>
              <p className="mb-2 text-xs font-bold tracking-[0.1em] text-[#20312d] uppercase">
                Size
              </p>
              <div className="flex flex-wrap gap-2">
                {sizes.map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setSelectedSize(size)}
                    className={`min-w-[2.75rem] rounded-md border px-3 py-2 text-sm font-semibold transition-colors ${
                      selectedSize === size
                        ? "border-[var(--eco-primary)] bg-[var(--eco-primary-soft)] text-[var(--eco-primary-dark)]"
                        : "border-[rgba(32,49,45,0.12)] text-[#20312d] hover:border-[var(--eco-primary)]"
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {colors.length > 1 || colors[0] !== "Default" ? (
            <div>
              <p className="mb-2 text-xs font-bold tracking-[0.1em] text-[#20312d] uppercase">
                Color
              </p>
              <div className="flex flex-wrap gap-2">
                {colors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setSelectedColor(color)}
                    className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                      selectedColor === color
                        ? "border-[var(--eco-primary)] bg-[var(--eco-primary-soft)] text-[var(--eco-primary-dark)]"
                        : "border-[rgba(32,49,45,0.12)] text-[#20312d] hover:border-[var(--eco-primary)]"
                    }`}
                  >
                    {color}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div>
            <p className="mb-2 text-xs font-bold tracking-[0.1em] text-[#20312d] uppercase">
              Quantity
            </p>
            <div className="inline-flex items-center rounded-md border border-[rgba(32,49,45,0.12)] bg-white">
              <button
                type="button"
                aria-label="Decrease quantity"
                disabled={quantity <= 1}
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="flex h-11 w-11 items-center justify-center text-[#20312d] disabled:opacity-40"
              >
                <RemoveRoundedIcon fontSize="small" />
              </button>
              <span className="min-w-[2.5rem] text-center text-sm font-bold tabular-nums">
                {quantity}
              </span>
              <button
                type="button"
                aria-label="Increase quantity"
                disabled={quantity >= maxQty || !inStock}
                onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
                className="flex h-11 w-11 items-center justify-center text-[#20312d] disabled:opacity-40"
              >
                <AddRoundedIcon fontSize="small" />
              </button>
            </div>
            <p className="mt-1.5 text-xs text-[#61716a]">SKU: {product.inventory.sku}</p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              type="button"
              disabled={!inStock}
              onClick={handleAddToCart}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-md border-2 border-[var(--eco-primary)] bg-white text-sm font-bold text-[var(--eco-primary)] transition-colors hover:bg-[var(--eco-primary-soft)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ShoppingBagOutlinedIcon sx={{ fontSize: 20 }} />
              Add to cart
            </button>
            <button
              type="button"
              disabled={!inStock}
              onClick={handleBuyNow}
              className="inline-flex h-12 items-center justify-center rounded-md bg-[var(--eco-primary)] text-sm font-bold text-white transition-colors hover:bg-[var(--eco-primary-dark)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Buy now
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <a
              href={whatsAppHref}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#25D366] text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden>
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.881 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              WhatsApp
            </a>
            <a
              href={phoneTelHref(settings.contactPhone)}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#2563eb] text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              <PhoneOutlinedIcon sx={{ fontSize: 20 }} />
              {settings.contactPhone}
            </a>
          </div>

          <div className="grid grid-cols-3 gap-2 border-t border-[rgba(32,49,45,0.08)] pt-5">
            {trustItems.map((item) => (
              <div
                key={item.label}
                className="flex flex-col items-center gap-1.5 rounded-md bg-[#f6f3ed]/80 px-2 py-3 text-center"
              >
                <item.icon sx={{ fontSize: 22, color: "var(--eco-primary)" }} />
                <span className="text-[10px] font-semibold leading-tight text-[#61716a] sm:text-xs">
                  {item.label}
                </span>
              </div>
            ))}
          </div>

          <div className="rounded-lg border border-[rgba(32,49,45,0.1)] bg-white p-4 sm:p-5">
            <h2 className="flex items-center gap-2 text-sm font-bold text-[#20312d]">
              <CheckroomOutlinedIcon sx={{ fontSize: 20, color: "var(--eco-primary)" }} />
              Product details
            </h2>
            <p className="mt-3 text-sm leading-relaxed whitespace-pre-line text-[#61716a]">
              {product.description}
            </p>
            <ul className="mt-4 grid gap-2 text-sm text-[#61716a] sm:grid-cols-2">
              <li>
                <span className="font-semibold text-[#20312d]">Material:</span>{" "}
                {product.attributes.material || "—"}
              </li>
              <li>
                <span className="font-semibold text-[#20312d]">Fit:</span>{" "}
                {product.attributes.fit || "—"}
              </li>
              <li>
                <span className="font-semibold text-[#20312d]">Care:</span>{" "}
                {product.attributes.care || "—"}
              </li>
              <li>
                <span className="font-semibold text-[#20312d]">Season:</span>{" "}
                {product.attributes.season || "—"}
              </li>
            </ul>
            {product.tags.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {product.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-md bg-[var(--eco-primary-soft)] px-2 py-0.5 text-xs font-medium text-[var(--eco-primary-dark)]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {relatedProducts.length > 0 ? (
        <section className="border-t border-[rgba(32,49,45,0.1)] pt-10">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-[#20312d] sm:text-xl">
                Same category: {product.category}
              </h2>
              <p className="mt-1 text-sm text-[#61716a]">More pieces you might like</p>
            </div>
            <Link
              href={`/shop/${product.category_slug}`}
              className="shrink-0 text-sm font-semibold text-[var(--eco-primary)] hover:underline"
            >
              View all
            </Link>
          </div>
          <div className="grid grid-cols-2 items-start gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 lg:gap-4">
            {relatedProducts.map((item) => (
              <CollectionProductCard key={item.id} product={item} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
