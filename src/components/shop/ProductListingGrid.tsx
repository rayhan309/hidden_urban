import { CollectionProductCard } from "@/components/product/CollectionProductCard";
import type { Product } from "@/types/product";

type ProductListingGridProps = {
  products: Product[];
  emptyTitle?: string;
  emptyDescription?: string;
};

export function ProductListingGrid({
  products,
  emptyTitle = "No products found",
  emptyDescription = "Try another category or check back soon.",
}: ProductListingGridProps) {
  if (products.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-[rgba(32,49,45,0.2)] bg-white px-6 py-16 text-center">
        <p className="text-lg font-bold text-[#20312d]">{emptyTitle}</p>
        <p className="mt-2 text-sm text-[#61716a]">{emptyDescription}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 items-start gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 lg:gap-4">
      {products.map((product) => (
        <CollectionProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
