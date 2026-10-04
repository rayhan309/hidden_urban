import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth/get-session";
import { canManageProducts } from "@/lib/auth/permissions";
import { dbConnect } from "@/lib/dbConnect";
import {
  deleteAdminProductRecord,
  findAdminProductRecord,
  getAdminProductFormValues,
  isSlugTakenByOther,
  updateAdminProductRecord,
} from "@/lib/products/admin-product-record";
import {
  createProductApiSchema,
  normalizeProductSlug,
  slugifyTitle,
  validationErrorMessage,
} from "@/lib/validations/product";
import { getCategories } from "@/services/categories";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const session = await getAdminSession();
    if (!session || !canManageProducts(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await context.params;
    const record = await findAdminProductRecord(id);
    if (!record) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const form = await getAdminProductFormValues(id);
    if (!form) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json({ id: record.id, source: record.source, form });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load product";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const session = await getAdminSession();
    if (!session || !canManageProducts(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await context.params;
    const record = await findAdminProductRecord(id);
    if (!record) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
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
    const categories = await getCategories();
    const category = categories.find((c) => c.id === data.categoryId);
    if (!category) {
      return NextResponse.json({ error: "Invalid category" }, { status: 400 });
    }

    await dbConnect();
    const requestedSlug =
      (data.slug.trim() || slugifyTitle(data.titleEn)).toLowerCase() || record.slug;
    let slug = requestedSlug;
    if (slug !== record.slug && (await isSlugTakenByOther(slug, record))) {
      return NextResponse.json({ error: "Slug is already in use" }, { status: 409 });
    }

    const updated = await updateAdminProductRecord(id, data, category, slug);
    return NextResponse.json({ product: { id: updated.id, slug: updated.slug } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update product";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const session = await getAdminSession();
    if (!session || !canManageProducts(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await context.params;
    await deleteAdminProductRecord(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete product";
    const status = message === "Product not found" ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
