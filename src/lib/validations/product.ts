import { z } from "zod";

export const productTypes = ["regular", "variable"] as const;
export const stockStatuses = ["in_stock", "out_of_stock", "on_backorder"] as const;
export const shippingClasses = ["standard", "express", "free"] as const;

function parseMoney(value: string) {
  const n = Number(String(value).replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : NaN;
}

export const productVariantFormSchema = z.object({
  label: z.string().min(1, "Variation label is required"),
  regularPrice: z.string().min(1, "Price is required"),
  salePrice: z.string().optional(),
  stockQuantity: z.string().optional(),
  stockStatus: z.enum(stockStatuses),
});

export type ProductVariantFormValues = z.infer<typeof productVariantFormSchema>;

function validateVariantRow(
  variant: ProductVariantFormValues,
  index: number,
  ctx: z.RefinementCtx,
) {
  const regular = parseMoney(variant.regularPrice);
  if (!Number.isFinite(regular) || regular < 0) {
    ctx.addIssue({
      code: "custom",
      path: ["variants", index, "regularPrice"],
      message: "Enter a valid price",
    });
  }

  if (variant.salePrice?.trim()) {
    const sale = parseMoney(variant.salePrice);
    if (!Number.isFinite(sale) || sale < 0) {
      ctx.addIssue({
        code: "custom",
        path: ["variants", index, "salePrice"],
        message: "Enter a valid sale price",
      });
    } else if (Number.isFinite(regular) && sale > regular) {
      ctx.addIssue({
        code: "custom",
        path: ["variants", index, "salePrice"],
        message: "Sale price cannot exceed regular price",
      });
    }
  }

  if (variant.stockQuantity?.trim()) {
    const qty = Number(variant.stockQuantity);
    if (!Number.isFinite(qty) || qty < 0) {
      ctx.addIssue({
        code: "custom",
        path: ["variants", index, "stockQuantity"],
        message: "Enter a valid quantity",
      });
    }
  }
}

export const addProductFormSchema = z
  .object({
    titleEn: z.string().min(2, "Title is required"),
    slug: z
      .string()
      .min(2, "Slug is required")
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and hyphens"),
    brandVendor: z.string().optional(),
    description: z.string().optional(),
    productType: z.enum(productTypes),
    regularPrice: z.string().optional(),
    salePrice: z.string().optional(),
    stockQuantity: z.string().optional(),
    stockStatus: z.enum(stockStatuses),
    variants: z.array(productVariantFormSchema).default([]),
    variableAttributeId: z.string().optional(),
    variableOptionsText: z.string().optional(),
    categoryId: z.string().min(1, "Category is required"),
    shippingClass: z.enum(shippingClasses),
    tags: z.array(z.string()),
    rating: z.string().optional(),
    reviews: z.string().optional(),
    mainImageUrl: z.string().optional(),
    galleryUrls: z.array(z.string().url()),
  })
  .superRefine((data, ctx) => {
    if (data.productType === "variable") {
      if (data.variants.length === 0) {
        ctx.addIssue({
          code: "custom",
          path: ["variants"],
          message: "Add at least one variation with price and stock",
        });
      }
      data.variants.forEach((variant, index) => validateVariantRow(variant, index, ctx));
      return;
    }

    if (!data.regularPrice?.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["regularPrice"],
        message: "Regular price is required",
      });
      return;
    }

    const regular = parseMoney(data.regularPrice);
    if (!Number.isFinite(regular) || regular < 0) {
      ctx.addIssue({
        code: "custom",
        path: ["regularPrice"],
        message: "Enter a valid price",
      });
    }

    if (data.salePrice?.trim()) {
      const sale = parseMoney(data.salePrice);
      if (!Number.isFinite(sale) || sale < 0) {
        ctx.addIssue({
          code: "custom",
          path: ["salePrice"],
          message: "Enter a valid sale price",
        });
      } else if (Number.isFinite(regular) && sale > regular) {
        ctx.addIssue({
          code: "custom",
          path: ["salePrice"],
          message: "Sale price cannot exceed regular price",
        });
      }
    }

    if (data.stockQuantity?.trim()) {
      const qty = Number(data.stockQuantity);
      if (!Number.isFinite(qty) || qty < 0) {
        ctx.addIssue({
          code: "custom",
          path: ["stockQuantity"],
          message: "Enter a valid quantity",
        });
      }
    }
  });

export type AddProductFormValues = z.infer<typeof addProductFormSchema>;

export const createProductApiSchema = addProductFormSchema;

export function slugifyTitle(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function normalizeProductSlug(slug: string, title: string) {
  return slugifyTitle(slug) || slugifyTitle(title);
}

export function validationErrorMessage(error: { issues: { message: string }[] }) {
  const messages = [...new Set(error.issues.map((issue) => issue.message).filter(Boolean))];
  return messages.join(" ") || "Invalid product data";
}

export function calcDiscountPercent(regular: number, sale: number | null) {
  if (!sale || regular <= 0 || sale >= regular) return 0;
  return Math.round((1 - sale / regular) * 100);
}

export function deriveRegularFieldsFromVariants(variants: ProductVariantFormValues[]) {
  if (variants.length === 0) {
    return {
      regularPrice: "0",
      salePrice: "",
      stockQuantity: "0",
      stockStatus: "out_of_stock" as const,
    };
  }

  let minRegular = Infinity;
  let minSale: number | null = null;
  let minEffective = Infinity;
  let totalStock = 0;
  let anyInStock = false;

  for (const variant of variants) {
    const regular = parseMoney(variant.regularPrice);
    const sale = variant.salePrice?.trim() ? parseMoney(variant.salePrice) : null;
    const effective = sale != null && sale < regular ? sale : regular;
    if (effective < minEffective) {
      minEffective = effective;
      minRegular = regular;
      minSale = sale != null && sale < regular ? sale : null;
    }
    const qty = variant.stockQuantity?.trim() ? Number(variant.stockQuantity) : 0;
    if (variant.stockStatus === "in_stock" && qty > 0) {
      anyInStock = true;
      totalStock += qty;
    }
  }

  return {
    regularPrice: Number.isFinite(minRegular) ? String(minRegular) : "0",
    salePrice: minSale != null ? String(minSale) : "",
    stockQuantity: String(totalStock),
    stockStatus: (anyInStock ? "in_stock" : "out_of_stock") as "in_stock" | "out_of_stock",
  };
}
