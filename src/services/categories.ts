import { cache } from "react";
import { getCategoriesFromDbOrFallback } from "@/lib/db/readers/categories";
import type { Category } from "@/types/category";

export const getCategories = cache(async function getCategories(): Promise<Category[]> {
  return getCategoriesFromDbOrFallback();
});

export async function getTopCategories(limit = 10): Promise<Category[]> {
  const categories = await getCategories();
  return categories
    .slice()
    .sort((a, b) => b.rating - a.rating)
    .slice(0, limit);
}

export async function getCategoryBySlug(slug: string): Promise<Category | undefined> {
  const categories = await getCategories();
  return categories.find((category) => category.slug === slug);
}
