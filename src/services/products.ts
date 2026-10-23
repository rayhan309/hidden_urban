import { cache } from "react";
import {
  getProductsFromDbOrFallback,
  readRecentProductsFromDb,
} from "@/lib/db/readers/products";
import type { Product } from "@/types/product";

export const getProducts = cache(async function getProducts(): Promise<Product[]> {
  return getProductsFromDbOrFallback();
});

export async function getProductBySlug(slug: string): Promise<Product | undefined> {
  const products = await getProducts();
  return products.find((product) => product.slug === slug);
}

export async function getProductsByCategory(categorySlug: string): Promise<Product[]> {
  const products = await getProducts();
  return products.filter((product) => product.category_slug === categorySlug);
}

export async function getRelatedProducts(
  product: Product,
  limit = 5,
): Promise<Product[]> {
  const products = await getProductsByCategory(product.category_slug);
  return products.filter((item) => item.id !== product.id).slice(0, limit);
}

export async function getRecentProducts(limit = 12): Promise<Product[]> {
  return readRecentProductsFromDb(limit);
}
