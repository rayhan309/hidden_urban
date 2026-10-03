export const queryKeys = {
  site: {
    all: ["site"] as const,
    settings: () => [...queryKeys.site.all, "settings"] as const,
    categories: () => [...queryKeys.site.all, "categories"] as const,
  },
  home: {
    all: ["home"] as const,
    page: () => [...queryKeys.home.all, "page"] as const,
  },
  store: {
    all: ["store"] as const,
    orderRegion: () => [...queryKeys.store.all, "order-region"] as const,
  },
  admin: {
    all: ["admin"] as const,
    overview: () => [...queryKeys.admin.all, "overview"] as const,
    orders: () => [...queryKeys.admin.all, "orders"] as const,
    blockedIps: () => [...queryKeys.admin.all, "blocked-ips"] as const,
    order: (id: string) => [...queryKeys.admin.orders(), id] as const,
    orderProductOptions: () =>
      [...queryKeys.admin.orders(), "product-options"] as const,
    productsCatalog: () => [...queryKeys.admin.all, "products-catalog"] as const,
    categories: () => [...queryKeys.admin.all, "categories"] as const,
    customers: () => [...queryKeys.admin.all, "customers"] as const,
    productAttributes: () => [...queryKeys.admin.all, "product-attributes"] as const,
    collections: () => [...queryKeys.admin.all, "collections"] as const,
    settings: () => [...queryKeys.admin.all, "settings"] as const,
  },
} as const;
