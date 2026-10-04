import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth/get-session";
import { canManageProducts } from "@/lib/auth/permissions";
import { dbConnect } from "@/lib/dbConnect";
import {
  createProductApiSchema,
  normalizeProductSlug,
  validationErrorMessage,
} from "@/lib/validations/product";
import { buildStoredProductFields } from "@/lib/products/build-product-payload";
import { ProductModel } from "@/models/Product";
import { getCategories } from "@/services/categories";
import { resolveUniqueProductSlug } from "@/lib/products/resolve-unique-slug";

export async function POST(request: Request) {
  try {
    const session = await getAdminSession();
    if (!session || !canManageProducts(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const json = await request.json();
    if (json && typeof json === "object") {
      const body = json as { slug?: unknown; titleEn?: unknown };
      body.slug = normalizeProductSlug(String(body.slug ?? ""), String(body.titleEn ?? ""));
    }
    const parsed = createProductApiSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: validationErrorMessage(parsed.error), details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const data = parsed.data;
    const stored = buildStoredProductFields(data);

    const categories = await getCategories();
    const category = categories.find((c) => c.id === data.categoryId);
    if (!category) {
      return NextResponse.json({ error: "Invalid category" }, { status: 400 });
    }

    await dbConnect();
    const slug = await resolveUniqueProductSlug(data.slug, data.titleEn);

    const product = await ProductModel.create({
      titleEn: data.titleEn.trim(),
      slug,
      brandVendor: data.brandVendor?.trim() ?? "",
      description: data.description?.trim() ?? "",
      productType: stored.productType,
      regularPrice: stored.regularPrice,
      salePrice: stored.salePrice,
      discountPercent: stored.discountPercent,
      stockQuantity: stored.stockQuantity,
      stockStatus: stored.stockStatus,
      variants: stored.variants,
      variableAttributeId: data.variableAttributeId?.trim() ?? "",
      variableOptionsText: data.variableOptionsText?.trim() ?? "",
      categoryId: category.id,
      categorySlug: category.slug,
      categoryTitle: category.title,
      shippingClass: data.shippingClass,
      tags: data.tags,
      rating: data.rating?.trim() ? Number(data.rating) : 0,
      reviews: data.reviews?.trim() ? Number(data.reviews) : 0,
      mainImageUrl: data.mainImageUrl?.trim() ?? "",
      galleryUrls: data.galleryUrls ?? [],
    });

    return NextResponse.json(
      {
        product: {
          id: product._id.toString(),
          slug: product.slug,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save product";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
