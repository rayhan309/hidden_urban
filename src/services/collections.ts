import { cache } from "react";
import { getCollectionsFromDbOrFallback } from "@/lib/db/readers/collections";
import { getProducts } from "@/services/products";
import type { Collection } from "@/types/collection";
import type { Product } from "@/types/product";

export const getCollections = cache(async function getCollections(): Promise<Collection[]> {
  return getCollectionsFromDbOrFallback();
});

export async function getCollectionBySlug(slug: string): Promise<Collection | undefined> {
  const collections = await getCollections();
  return collections.find((collection) => collection.slug === slug);
}

export async function getCollectionProductsBySlug(slug: string): Promise<Product[]> {
  const [collection, products] = await Promise.all([
    getCollectionBySlug(slug),
    getProducts(),
  ]);
  if (!collection) return [];
  const idSet = new Set(collection.productIds);
  return products.filter((product) => idSet.has(product.id));
}
