"use client";

import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import CloudUploadOutlinedIcon from "@mui/icons-material/CloudUploadOutlined";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import LayersOutlinedIcon from "@mui/icons-material/LayersOutlined";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { Controller, useForm, type FieldPath } from "react-hook-form";
import { SettingsSection } from "@/components/admin/settings/SettingsSection";
import { VariablePricingSection } from "@/components/admin/products/VariablePricingSection";
import { ADMIN_ACCENT } from "@/lib/constants/admin";
import {
  addProductFormSchema,
  calcDiscountPercent,
  deriveRegularFieldsFromVariants,
  normalizeProductSlug,
  validationErrorMessage,
  type AddProductFormValues,
} from "@/lib/validations/product";
import { createProduct, updateProduct } from "@/services/admin-product-mutations";
import { useToast } from "@/context/toast/ToastProvider";
import { queryKeys } from "@/lib/queries/query-keys";
import { uploadImageToImageKit } from "@/lib/imagekit/upload-client";
import type { Category } from "@/types/category";
import type { ProductAttribute } from "@/data/dummy/product-attributes";

type AddProductViewProps = {
  categories: Category[];
  attributes: ProductAttribute[];
  productId?: string;
  initialValues?: AddProductFormValues;
};

const emptyDefaults: AddProductFormValues = {
  titleEn: "",
  slug: "",
  brandVendor: "",
  description: "",
  productType: "regular",
  regularPrice: "",
  salePrice: "",
  stockQuantity: "",
  stockStatus: "in_stock",
  categoryId: "",
  shippingClass: "standard",
  tags: [],
  rating: "0",
  reviews: "0",
  mainImageUrl: "",
  galleryUrls: [],
  variants: [],
  variableAttributeId: "",
  variableOptionsText: "",
};

function UploadDropzone({
  label,
  hint,
  previewUrl,
  uploading,
  onPick,
}: {
  label: string;
  hint: string;
  previewUrl?: string;
  uploading?: boolean;
  onPick: (file: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <Box
      role="button"
      tabIndex={0}
      onClick={() => !uploading && inputRef.current?.click()}
      onKeyDown={(event) => {
        if (uploading) return;
        if (event.key === "Enter" || event.key === " ") inputRef.current?.click();
      }}
      sx={{
        border: "1px dashed",
        borderColor: "rgba(0,0,0,0.15)",
        borderRadius: 1.5,
        bgcolor: "#fafafa",
        p: 2,
        minHeight: 140,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        cursor: uploading ? "wait" : "pointer",
        opacity: uploading ? 0.7 : 1,
        "&:hover": { borderColor: ADMIN_ACCENT, bgcolor: "rgba(31,111,91,0.04)" },
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onPick(file);
          event.target.value = "";
        }}
      />
      {previewUrl ? (
        <Box sx={{ position: "relative", width: "100%", height: 120, borderRadius: 1, overflow: "hidden" }}>
          <Image src={previewUrl} alt="" fill style={{ objectFit: "cover" }} />
        </Box>
      ) : uploading ? (
        <>
          <CircularProgress size={28} sx={{ color: ADMIN_ACCENT, mb: 1 }} />
          <Typography sx={{ fontWeight: 600, fontSize: "0.9rem" }}>Uploading…</Typography>
        </>
      ) : (
        <>
          <CloudUploadOutlinedIcon sx={{ color: ADMIN_ACCENT, mb: 1 }} />
          <Typography sx={{ fontWeight: 600, fontSize: "0.9rem" }}>{label}</Typography>
          <Typography sx={{ mt: 0.5, fontSize: "0.75rem", color: "text.secondary" }}>{hint}</Typography>
        </>
      )}
    </Box>
  );
}

export function AddProductView({ categories, attributes, productId, initialValues }: AddProductViewProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const isEdit = Boolean(productId);
  const [tagInput, setTagInput] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [uploadingMain, setUploadingMain] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);

  const {
    control,
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<AddProductFormValues>({
    defaultValues: initialValues ?? emptyDefaults,
    mode: "onBlur",
  });

  const productType = watch("productType");
  const titleEn = watch("titleEn");
  const slug = watch("slug");
  const regularPrice = watch("regularPrice");
  const salePrice = watch("salePrice");
  const tags = watch("tags");
  const mainImageUrl = watch("mainImageUrl");
  const galleryUrls = watch("galleryUrls");
  const variants = watch("variants");
  const variableAttributeId = watch("variableAttributeId");
  const variableOptionsText = watch("variableOptionsText");

  const variableSummary =
    productType === "variable" && variants?.length
      ? deriveRegularFieldsFromVariants(variants)
      : null;

  const discountLabel = useMemo(() => {
    const regular = Number(String(regularPrice).replace(/,/g, ""));
    const sale = salePrice?.trim() ? Number(String(salePrice).replace(/,/g, "")) : null;
    if (!Number.isFinite(regular) || regular <= 0) return "—";
    const pct = calcDiscountPercent(regular, Number.isFinite(sale!) ? sale : null);
    return pct > 0 ? `${pct}%` : "—";
  }, [regularPrice, salePrice]);

  const saveMutation = useMutation({
    mutationFn: async (values: AddProductFormValues) => {
      if (productId) {
        return updateProduct(productId, values);
      }
      return createProduct(values);
    },
    onSuccess: async () => {
      showToast(isEdit ? "Product updated successfully" : "Product created successfully");
      await queryClient.invalidateQueries({ queryKey: queryKeys.admin.productsCatalog() });
      router.push("/dashboard/admin/products");
      router.refresh();
    },
  });

  function applySlug(rawSlug = slug, rawTitle = titleEn) {
    const next = normalizeProductSlug(rawSlug, rawTitle);
    if (next !== rawSlug) {
      setValue("slug", next, { shouldValidate: true });
    }
    return next;
  }

  function onSubmit(values: AddProductFormValues) {
    setFormError(null);
    clearErrors();
    const next = { ...values, slug: applySlug(values.slug, values.titleEn) };
    const parsed = addProductFormSchema.safeParse(next);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const name = issue.path.map(String).join(".");
        if (!name) continue;
        setError(name as FieldPath<AddProductFormValues>, { message: issue.message });
      }
      setFormError(validationErrorMessage(parsed.error));
      return;
    }
    saveMutation.mutate(parsed.data);
  }

  function addTag() {
    const next = tagInput.trim();
    if (!next) return;
    if (tags.includes(next)) {
      setTagInput("");
      return;
    }
    setValue("tags", [...tags, next], { shouldValidate: true });
    setTagInput("");
  }

  async function setMainImage(file: File) {
    try {
      setImageError(null);
      setUploadingMain(true);
      const url = await uploadImageToImageKit(file);
      setValue("mainImageUrl", url, { shouldValidate: true });
    } catch (error) {
      setImageError(error instanceof Error ? error.message : "Invalid image");
    } finally {
      setUploadingMain(false);
    }
  }

  async function addGalleryImage(file: File) {
    try {
      setImageError(null);
      setUploadingGallery(true);
      const url = await uploadImageToImageKit(file);
      setValue("galleryUrls", [...galleryUrls, url], { shouldValidate: true });
    } catch (error) {
      setImageError(error instanceof Error ? error.message : "Invalid image");
    } finally {
      setUploadingGallery(false);
    }
  }

  return (
    <Box sx={{ width: "100%", minWidth: 0, pb: 10 }}>
      <Box sx={{ mb: 2.5 }}>
        <Button
          component={Link}
          href="/dashboard/admin/products"
          startIcon={<ArrowBackRoundedIcon />}
          sx={{ mb: 1.5, textTransform: "none", color: "text.secondary", px: 0 }}
        >
          Back to catalog
        </Button>
        <Typography
          sx={{
            fontSize: "0.7rem",
            fontWeight: 700,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: ADMIN_ACCENT,
          }}
        >
          {isEdit ? "Edit product" : "New product"}
        </Typography>
        <Typography
          sx={{
            mt: 0.5,
            fontSize: { xs: "1.35rem", sm: "1.5rem" },
            fontWeight: 700,
            letterSpacing: "-0.02em",
          }}
        >
          {isEdit ? "Edit product" : "Add product"}
        </Typography>
        <Typography sx={{ mt: 0.5, fontSize: "0.9rem", color: "text.secondary" }}>
          Fill in product details, pricing, and media.
        </Typography>
      </Box>

      {formError || saveMutation.isError ? (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 1 }}>
          {formError ??
            (saveMutation.error instanceof Error
              ? saveMutation.error.message
              : "Failed to save product")}
        </Alert>
      ) : null}

      {imageError ? (
        <Alert severity="warning" sx={{ mb: 2, borderRadius: 1 }} onClose={() => setImageError(null)}>
          {imageError}
        </Alert>
      ) : null}

      <Box component="form" onSubmit={handleSubmit(onSubmit)}>
        <Grid container spacing={2.5} sx={{ alignItems: "flex-start" }}>
          <Grid size={{ xs: 12, lg: 8 }}>
            <Stack spacing={2.5}>
              <Typography
                sx={{
                  fontSize: "0.65rem",
                  fontWeight: 700,
                  letterSpacing: "0.14em",
                  color: "text.secondary",
                }}
              >
                DETAILS
              </Typography>

              <SettingsSection title="Basic information" description="Titles, slug, and description.">
                <Stack spacing={2}>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <TextField
                        label="Title"
                        fullWidth
                        required
                        error={Boolean(errors.titleEn)}
                        helperText={errors.titleEn?.message}
                        {...register("titleEn", {
                          required: true,
                          onBlur: () => applySlug(),
                        })}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <TextField
                        label="Slug (auto)"
                        fullWidth
                        error={Boolean(errors.slug)}
                        helperText={
                          errors.slug?.message ??
                          (titleEn.trim() && !normalizeProductSlug("", titleEn)
                            ? "Bengali titles need a Latin slug, like premium-sunglasses"
                            : "Generated from title. Spaces become hyphens.")
                        }
                        {...register("slug", {
                          onBlur: (event) => applySlug(event.target.value),
                        })}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <TextField label="Brand / Vendor" fullWidth {...register("brandVendor")} />
                    </Grid>
                    <Grid size={12}>
                      <TextField
                        label="Description"
                        fullWidth
                        multiline
                        minRows={4}
                        {...register("description")}
                      />
                    </Grid>
                  </Grid>
                </Stack>
              </SettingsSection>

              <SettingsSection title="Product type" description="Regular or variable inventory.">
                <Grid container spacing={1.5}>
                  {(
                    [
                      {
                        value: "regular" as const,
                        title: "Regular product",
                        sub: "Single price and stock for the whole product.",
                        icon: Inventory2OutlinedIcon,
                      },
                      {
                        value: "variable" as const,
                        title: "Variable product",
                        sub: "Different price and stock per variant.",
                        icon: LayersOutlinedIcon,
                      },
                    ] as const
                  ).map((option) => {
                    const Icon = option.icon;
                    const active = productType === option.value;
                    return (
                      <Grid key={option.value} size={{ xs: 12, sm: 6 }}>
                        <Controller
                          name="productType"
                          control={control}
                          render={({ field }) => (
                            <Box
                              role="button"
                              tabIndex={0}
                              onClick={() => field.onChange(option.value)}
                              onKeyDown={(event) => {
                                if (event.key === "Enter" || event.key === " ") {
                                  field.onChange(option.value);
                                }
                              }}
                              sx={{
                                p: 2,
                                borderRadius: 1.5,
                                border: "2px solid",
                                borderColor: active ? ADMIN_ACCENT : "rgba(0,0,0,0.08)",
                                bgcolor: active ? "rgba(31,111,91,0.06)" : "#fff",
                                cursor: "pointer",
                                height: "100%",
                              }}
                            >
                              <Box sx={{ display: "flex", gap: 1.25, alignItems: "flex-start" }}>
                                <Icon sx={{ color: active ? ADMIN_ACCENT : "text.secondary" }} />
                                <Box>
                                  <Typography sx={{ fontWeight: 700, fontSize: "0.9rem" }}>
                                    {option.title}
                                  </Typography>
                                  <Typography sx={{ mt: 0.35, fontSize: "0.8rem", color: "text.secondary" }}>
                                    {option.sub}
                                  </Typography>
                                </Box>
                              </Box>
                            </Box>
                          )}
                        />
                      </Grid>
                    );
                  })}
                </Grid>
              </SettingsSection>

              {productType === "variable" ? (
                <VariablePricingSection
                  attributes={attributes}
                  control={control}
                  errors={errors}
                  setValue={setValue}
                  variants={variants}
                  variableAttributeId={variableAttributeId}
                  variableOptionsText={variableOptionsText}
                />
              ) : null}

              {productType === "regular" ? (
              <SettingsSection title="Pricing & inventory" description="Price, discount, and stock.">
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <TextField
                      label="Regular price (৳)"
                      fullWidth
                      required
                      error={Boolean(errors.regularPrice)}
                      helperText={errors.regularPrice?.message}
                      {...register("regularPrice")}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <TextField
                      label="Sale price (৳)"
                      fullWidth
                      error={Boolean(errors.salePrice)}
                      helperText={errors.salePrice?.message}
                      {...register("salePrice")}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <TextField label="Discount" fullWidth value={discountLabel} disabled />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <TextField
                      label="Stock quantity"
                      fullWidth
                      error={Boolean(errors.stockQuantity)}
                      helperText={errors.stockQuantity?.message}
                      {...register("stockQuantity")}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                    <Controller
                      name="stockStatus"
                      control={control}
                      render={({ field }) => (
                        <FormControl fullWidth>
                          <InputLabel id="stock-status-label">Stock status</InputLabel>
                          <Select {...field} labelId="stock-status-label" label="Stock status">
                            <MenuItem value="in_stock">In stock</MenuItem>
                            <MenuItem value="out_of_stock">Out of stock</MenuItem>
                            <MenuItem value="on_backorder">On backorder</MenuItem>
                          </Select>
                        </FormControl>
                      )}
                    />
                  </Grid>
                </Grid>
              </SettingsSection>
              ) : variableSummary ? (
                <SettingsSection
                  title="Catalog summary"
                  description="Computed from your variations for the product list."
                >
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 6, sm: 3 }}>
                      <TextField
                        label="From price (৳)"
                        fullWidth
                        value={variableSummary.salePrice || variableSummary.regularPrice}
                        disabled
                      />
                    </Grid>
                    <Grid size={{ xs: 6, sm: 3 }}>
                      <TextField label="Total stock" fullWidth value={variableSummary.stockQuantity} disabled />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        label="Stock status"
                        fullWidth
                        value={variableSummary.stockStatus === "in_stock" ? "In stock" : "Out of stock"}
                        disabled
                      />
                    </Grid>
                  </Grid>
                </SettingsSection>
              ) : null}
            </Stack>
          </Grid>

          <Grid size={{ xs: 12, lg: 4 }}>
            <Stack spacing={2.5}>
              <Typography
                sx={{
                  fontSize: "0.65rem",
                  fontWeight: 700,
                  letterSpacing: "0.14em",
                  color: "text.secondary",
                }}
              >
                MEDIA & ORGANIZATION
              </Typography>

              <SettingsSection title="Product image" description="Main catalog image.">
                <UploadDropzone
                  label="Upload main image"
                  hint="PNG, JPG up to 10MB · stored on ImageKit"
                  previewUrl={mainImageUrl || undefined}
                  uploading={uploadingMain}
                  onPick={setMainImage}
                />
              </SettingsSection>

              <SettingsSection
                title="Product gallery"
                description="Additional photos."
                headerAction={
                  <Button size="small" sx={{ textTransform: "none", color: ADMIN_ACCENT }}>
                    + Add
                  </Button>
                }
              >
                <UploadDropzone
                  label="Add gallery images"
                  hint="PNG, JPG up to 10MB · stored on ImageKit"
                  uploading={uploadingGallery}
                  onPick={addGalleryImage}
                />
                {galleryUrls.length > 0 ? (
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 1.5 }}>
                    {galleryUrls.map((url, index) => (
                      <Box
                        key={`${url.slice(0, 24)}-${index}`}
                        sx={{ position: "relative", width: 72, height: 72, borderRadius: 1, overflow: "hidden" }}
                      >
                        <Image src={url} alt="" fill style={{ objectFit: "cover" }} />
                      </Box>
                    ))}
                  </Box>
                ) : null}
              </SettingsSection>

              <SettingsSection title="Organization" description="Category, shipping, and tags.">
                <Stack spacing={2}>
                  <Controller
                    name="categoryId"
                    control={control}
                    rules={{ required: "Category is required" }}
                    render={({ field }) => (
                      <FormControl fullWidth error={Boolean(errors.categoryId)}>
                        <InputLabel id="category-label">Select category</InputLabel>
                        <Select {...field} labelId="category-label" label="Select category">
                          {categories.map((category) => (
                            <MenuItem key={category.id} value={category.id}>
                              {category.title}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    )}
                  />

                  <Controller
                    name="shippingClass"
                    control={control}
                    render={({ field }) => (
                      <FormControl fullWidth>
                        <InputLabel id="shipping-class-label">Shipping class</InputLabel>
                        <Select {...field} labelId="shipping-class-label" label="Shipping class">
                          <MenuItem value="standard">Standard</MenuItem>
                          <MenuItem value="express">Express</MenuItem>
                          <MenuItem value="free">Free</MenuItem>
                        </Select>
                      </FormControl>
                    )}
                  />

                  <Box>
                    <TextField
                      label="Tags"
                      fullWidth
                      value={tagInput}
                      onChange={(event) => setTagInput(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === ",") {
                          event.preventDefault();
                          addTag();
                        }
                      }}
                      helperText="Press Enter to add a tag"
                    />
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, mt: 1 }}>
                      {tags.map((tag) => (
                        <Chip
                          key={tag}
                          label={tag}
                          size="small"
                          onDelete={() =>
                            setValue(
                              "tags",
                              tags.filter((item) => item !== tag),
                              { shouldValidate: true },
                            )
                          }
                        />
                      ))}
                    </Box>
                  </Box>

                  <Grid container spacing={2}>
                    <Grid size={6}>
                      <TextField label="Rating" fullWidth {...register("rating")} />
                    </Grid>
                    <Grid size={6}>
                      <TextField label="Reviews" fullWidth {...register("reviews")} />
                    </Grid>
                  </Grid>
                </Stack>
              </SettingsSection>
            </Stack>
          </Grid>
        </Grid>

        <Box
          sx={{
            position: "sticky",
            bottom: 0,
            mt: 3,
            py: 2,
            px: { xs: 0, sm: 1 },
            display: "flex",
            justifyContent: "flex-end",
            gap: 1.5,
            borderTop: "1px solid",
            borderColor: "rgba(0,0,0,0.08)",
            bgcolor: "rgba(244,245,247,0.92)",
            backdropFilter: "blur(8px)",
          }}
        >
          <Button component={Link} href="/dashboard/admin/products" sx={{ textTransform: "none" }}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={saveMutation.isPending || uploadingMain || uploadingGallery}
            startIcon={<CloudUploadOutlinedIcon />}
            sx={{
              bgcolor: ADMIN_ACCENT,
              textTransform: "none",
              fontWeight: 600,
              px: 2.5,
              "&:hover": { bgcolor: "#185a4a" },
            }}
          >
            {saveMutation.isPending ? "Saving…" : isEdit ? "Update product" : "Save product"}
          </Button>
        </Box>
      </Box>
    </Box>
  );
}
