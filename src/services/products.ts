import { getProductsFromDbOrFallback } from "@/lib/db/readers/products";
import { getCategories } from "@/services/categories";
import type { CategoryProductGroup } from "@/types/catalog";
import type { Product } from "@/types/product";

export async function getProducts(): Promise<Product[]> {
  return getProductsFromDbOrFallback();
}

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

export async function getFeaturedProducts(limit = 8): Promise<Product[]> {
  const products = await getProducts();
  return products
    .slice()
    .sort((a, b) => b.ratings.average - a.ratings.average)
    .slice(0, limit);
}

export async function getCollectionProducts(limit = 8): Promise<Product[]> {
  const products = await getProducts();
  return products.slice(0, limit);
}

export async function getRecentProducts(limit = 30): Promise<Product[]> {
  const products = await getProducts();
  return products
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
}

export async function getHomeCategoryProducts(
  perCategory = 5,
): Promise<CategoryProductGroup[]> {
  const [categories, products] = await Promise.all([getCategories(), getProducts()]);

  return categories.map((category) => ({
    category,
    products: products
      .filter((product) => product.category_slug === category.slug)
      .slice(0, perCategory),
  }));
}
