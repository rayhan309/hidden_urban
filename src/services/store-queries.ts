import type { AdminOverviewData } from "@/services/admin";
import type { AdminCustomersData } from "@/services/admin-customers";
import type { AdminProductsCatalog } from "@/services/admin-products";
import type { AdminOrder } from "@/types/admin-order";
import type { AdminCategory } from "@/types/admin-category";
import type { ProductAttribute } from "@/data/dummy/product-attributes";
import type { Collection } from "@/types/collection";
import type { Category } from "@/types/category";
import type { Product } from "@/types/product";
import type { PublicSiteSettings } from "@/types/site-settings";
import { api } from "@/lib/axios";
import { normalizePublicSiteSettings } from "@/lib/site-settings/public";

export async function fetchSiteSettings(): Promise<PublicSiteSettings> {
  const { data } = await api.get<PublicSiteSettings>("/api/store/settings");
  return normalizePublicSiteSettings(data);
}

export async function fetchStoreCategories(): Promise<Category[]> {
  const { data } = await api.get<Category[]>("/api/store/categories");
  return Array.isArray(data) ? data : [];
}

export async function fetchStoreProducts(): Promise<Product[]> {
  const { data } = await api.get<{ products?: Product[] }>("/api/products");
  return Array.isArray(data.products) ? data.products : [];
}

export async function fetchAdminOverviewData(): Promise<AdminOverviewData> {
  const { data } = await api.get<AdminOverviewData>("/api/admin/overview");
  return data;
}

export async function fetchAdminOrders(): Promise<AdminOrder[]> {
  const { data } = await api.get<AdminOrder[]>("/api/admin/orders");
  return data;
}

export async function fetchAdminProductsCatalog(): Promise<AdminProductsCatalog> {
  const { data } = await api.get<AdminProductsCatalog>("/api/admin/products-catalog");
  return data;
}

export async function fetchAdminCategories(): Promise<AdminCategory[]> {
  const { data } = await api.get<AdminCategory[]>("/api/admin/categories");
  return data;
}

export async function fetchAdminCustomers(): Promise<AdminCustomersData> {
  const { data } = await api.get<AdminCustomersData>("/api/admin/customers");
  return data;
}

export async function fetchProductAttributes(): Promise<ProductAttribute[]> {
  const { data } = await api.get<ProductAttribute[]>("/api/admin/product-attributes");
  return data;
}

export async function fetchAdminCollections(): Promise<Collection[]> {
  const { data } = await api.get<Collection[]>("/api/admin/collections");
  return data;
}
