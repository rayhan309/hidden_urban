import { cache } from "react";
import { dbConnect } from "@/lib/dbConnect";
import { getSeedModel } from "@/lib/seed/seed-model";
import { ProductModel } from "@/models/Product";
import {
  storedVariantsFromDoc,
  summarizeVariants,
  variantSizeOptions,
} from "@/lib/products/variant-utils";
import type { Product, ProductImage, ProductSize } from "@/types/product";

const APPAREL_SIZES = new Set(["XS", "S", "M", "L", "XL", "XXL"]);

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function mapPricing(value: unknown): Product["pricing"] {
  const o = record(value);
  const compareAt = o.compareAtPrice;
  return {
    price: Number(o.price ?? 0),
    compareAtPrice: compareAt != null && compareAt !== "" ? Number(compareAt) : null,
    currency: o.currency === "USD" ? "USD" : "BDT",
    discountPercent: Number(o.discountPercent ?? 0),
  };
}

function mapInventory(value: unknown): Product["inventory"] {
  const o = record(value);
  return {
    sku: String(o.sku ?? ""),
    quantity: Number(o.quantity ?? 0),
    inStock: Boolean(o.inStock ?? true),
  };
}

function toApparelSizes(values: unknown): ProductSize[] {
  if (!Array.isArray(values)) return [];
  return values
    .map(String)
    .filter((s): s is ProductSize => APPAREL_SIZES.has(s));
}

function mapAttributes(value: unknown): Product["attributes"] {
  const o = record(value);
  return {
    sizes: toApparelSizes(o.sizes),
    colors: Array.isArray(o.colors) ? o.colors.map(String) : [],
    material: String(o.material ?? ""),
    fit: String(o.fit ?? ""),
    care: String(o.care ?? ""),
    gender: String(o.gender ?? ""),
    season: String(o.season ?? ""),
    style: String(o.style ?? ""),
  };
}

function mapRatings(value: unknown): Product["ratings"] {
  const o = record(value);
  return {
    average: Number(o.average ?? 0),
    count: Number(o.count ?? 0),
  };
}

function mapImages(value: unknown, title: string): ProductImage[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      const o = record(item);
      const url = String(o.url ?? "");
      if (!url) return null;
      return { url, alt: String(o.alt ?? title) };
    })
    .filter((img): img is ProductImage => img !== null);
}

function mapProductDoc(doc: Record<string, unknown>): Product {
  const legacyId = String(doc.legacyId ?? doc.id ?? "");
  const title = String(doc.title ?? "");
  const images = mapImages(doc.images, title);

  return {
    id: legacyId,
    title,
    slug: String(doc.slug ?? ""),
    brand_or_vendor: String(doc.brand_or_vendor ?? ""),
    category: String(doc.category ?? ""),
    category_id: String(doc.category_id ?? ""),
    category_slug: String(doc.category_slug ?? ""),
    description: String(doc.description ?? ""),
    tags: Array.isArray(doc.tags) ? doc.tags.map(String) : [],
    pricing: mapPricing(doc.pricing),
    inventory: mapInventory(doc.inventory),
    attributes: mapAttributes(doc.attributes),
    ratings: mapRatings(doc.ratings),
    images,
    createdAt: String(doc.createdAt ?? new Date().toISOString()),
    updatedAt: String(doc.updatedAt ?? new Date().toISOString()),
  };
}

function mapAdminProductDoc(doc: Record<string, unknown>): Product {
  const id = String(doc._id ?? "");
  const title = String(doc.titleEn ?? "");
  const slug = String(doc.slug ?? "");
  const productType = doc.productType === "variable" ? "variable" : "regular";
  const variants = productType === "variable" ? storedVariantsFromDoc(doc.variants) : [];

  let regularPrice = Number(doc.regularPrice ?? 0);
  let salePrice =
    doc.salePrice != null && doc.salePrice !== "" ? Number(doc.salePrice) : null;
  let stockQuantity = Number(doc.stockQuantity ?? 0);
  let inStock = doc.stockStatus !== "out_of_stock";
  let discountPercent = Number(doc.discountPercent ?? 0);

  if (productType === "variable" && variants.length > 0) {
    const summary = summarizeVariants(variants);
    regularPrice = summary.regularPrice;
    salePrice = summary.salePrice;
    stockQuantity = summary.stockQuantity;
    inStock = summary.stockStatus === "in_stock";
    discountPercent = summary.discountPercent;
  }

  const sizeLabels = productType === "variable" ? variantSizeOptions(variants) : [];
  const displaySizes = toApparelSizes(sizeLabels);

  const mainImageUrl = String(doc.mainImageUrl ?? "");
  const galleryUrls = Array.isArray(doc.galleryUrls)
    ? doc.galleryUrls.map(String).filter(Boolean)
    : [];

  const images: ProductImage[] = [];
  if (mainImageUrl) images.push({ url: mainImageUrl, alt: title });
  for (const url of galleryUrls) {
    if (url !== mainImageUrl) images.push({ url, alt: title });
  }
  if (images.length === 0) {
    images.push({
      url: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=800&q=80",
      alt: title,
    });
  }

  const inStockResolved = inStock;
  const createdAt = String(doc.createdAt ?? new Date().toISOString());

  return {
    id,
    title,
    slug,
    brand_or_vendor: String(doc.brandVendor ?? "Hidden Urban"),
    category: String(doc.categoryTitle ?? ""),
    category_id: String(doc.categoryId ?? ""),
    category_slug: String(doc.categorySlug ?? ""),
    description: String(doc.description ?? ""),
    tags: Array.isArray(doc.tags) ? doc.tags.map(String) : [],
    pricing: {
      price: salePrice ?? regularPrice,
      compareAtPrice: salePrice ? regularPrice : null,
      currency: "BDT",
      discountPercent,
    },
    inventory: {
      sku: `EF-${slug.slice(0, 8).toUpperCase()}`,
      quantity: stockQuantity,
      inStock: inStockResolved,
    },
    attributes: {
      sizes: displaySizes,
      colors: [],
      material: "Mixed",
      fit: "Regular",
      care: "Follow care label",
      gender: "Men",
      season: "All season",
      style: "Casual",
    },
    ratings: {
      average: Number(doc.rating ?? 0),
      count: Number(doc.reviews ?? 0),
    },
    images,
    createdAt,
    updatedAt: String(doc.updatedAt ?? createdAt),
  };
}

export async function readCatalogProductsFromDb(): Promise<Product[]> {
  await dbConnect();
  const Model = getSeedModel("catalog_products");
  const docs = await Model.find({}).sort({ createdAt: -1 }).lean();
  return docs
    .map((doc) => mapProductDoc(doc as unknown as Record<string, unknown>))
    .filter((product) => Boolean(product.id && product.slug));
}

export async function readAdminCreatedProductsFromDb(): Promise<Product[]> {
  await dbConnect();
  const docs = await ProductModel.find({}).sort({ createdAt: -1 }).lean();
  return docs.map((doc) => mapAdminProductDoc(doc as unknown as Record<string, unknown>));
}

function mergeBySlug(products: Product[]): Product[] {
  const bySlug = new Map<string, Product>();
  for (const product of products) {
    if (!product.slug) continue;
    bySlug.set(product.slug, product);
  }
  return Array.from(bySlug.values());
}

export const getProductsFromDbOrFallback = cache(async function getProductsFromDbOrFallback(): Promise<Product[]> {
  try {
    const [catalog, adminCreated] = await Promise.all([
      readCatalogProductsFromDb(),
      readAdminCreatedProductsFromDb(),
    ]);

    return mergeBySlug([...catalog, ...adminCreated]).sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
  } catch (error) {
    console.error("[db] products read failed:", error);
    return [];
  }
});

/** Newest products only — avoids reading the full catalog for the homepage. */
export async function readRecentProductsFromDb(limit: number): Promise<Product[]> {
  try {
    await dbConnect();
    const Model = getSeedModel("catalog_products");
    const [catalogDocs, adminDocs] = await Promise.all([
      Model.find({}).sort({ createdAt: -1 }).limit(limit).lean(),
      ProductModel.find({}).sort({ createdAt: -1 }).limit(limit).lean(),
    ]);

    const catalog = catalogDocs
      .map((doc) => mapProductDoc(doc as unknown as Record<string, unknown>))
      .filter((product) => Boolean(product.id && product.slug));
    const adminCreated = adminDocs.map((doc) =>
      mapAdminProductDoc(doc as unknown as Record<string, unknown>),
    );

    return mergeBySlug([...catalog, ...adminCreated])
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  } catch (error) {
    console.error("[db] recent products read failed:", error);
    return [];
  }
}
