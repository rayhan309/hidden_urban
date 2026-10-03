import { getTopCategories } from "@/services/categories";
import { getCollections } from "@/services/collections";
import { getRecentProducts } from "@/services/products";
import { getClientReviews } from "@/services/reviews";
import type { Category } from "@/types/category";
import type { Collection } from "@/types/collection";
import type { Product } from "@/types/product";
import type { ClientReview } from "@/types/review";

export type HomePageData = {
  categories: Category[];
  recentProducts: Product[];
  collections: Collection[];
  reviews: ClientReview[];
};

export async function loadHomePageData(): Promise<HomePageData> {
  const [categories, recentProducts, collections, reviews] = await Promise.all([
    getTopCategories(10),
    getRecentProducts(30),
    getCollections(),
    getClientReviews(6),
  ]);

  return { categories, recentProducts, collections, reviews };
}
