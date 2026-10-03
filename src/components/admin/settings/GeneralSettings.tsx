"use client";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import UploadFileOutlinedIcon from "@mui/icons-material/UploadFileOutlined";
import {
  Alert,
  Box,
  Button,
  Chip,
  FormControl,
  FormControlLabel,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import { useRef, useState, useEffect, type ChangeEvent } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { SettingsSection } from "@/components/admin/settings/SettingsSection";
import { useAdminSiteSettings } from "@/hooks/useAdminSiteSettings";
import { ADMIN_ACCENT } from "@/lib/constants/admin";
import { DEFAULT_SITE_SETTINGS } from "@/lib/site-settings/defaults";
import { uploadImageToImageKit } from "@/lib/imagekit/upload-client";

const BRAND_PRESETS = [
  { label: "Eco green", value: "#1f6f5b" },
  { label: "Indigo", value: "#4f46e5" },
  { label: "Emerald", value: "#059669" },
  { label: "Orange", value: "#ea580c" },
  { label: "Rose", value: "#e11d48" },
  { label: "Sky", value: "#0284c7" },
  { label: "Violet", value: "#7c3aed" },
] as const;

const SOCIAL_PLATFORMS = [
  "Facebook",
  "Instagram",
  "X",
  "TikTok",
  "YouTube",
  "LinkedIn",
] as const;

type SocialLinkForm = {
  platform: (typeof SOCIAL_PLATFORMS)[number];
  url: string;
  visible: boolean;
};

type GeneralSettingsFormValues = {
  brandColor: string;
  shortDescription: string;
  tagline: string;
  copyrightText: string;
  socialLinks: SocialLinkForm[];
};

const HEX_PATTERN = /^#([0-9A-Fa-f]{6})$/;

const defaultValues: GeneralSettingsFormValues = {
  brandColor: ADMIN_ACCENT,
  shortDescription:
    "Men's fashion built for everyday clarity — thoughtful cuts, lasting fabrics, and pieces that work harder in your wardrobe.",
  tagline: "Made for modern men",
  copyrightText: "© {year} Hidden Urban. All rights reserved.",
  socialLinks: [
    { platform: "Instagram", url: "https://instagram.com", visible: true },
    { platform: "Facebook", url: "https://facebook.com", visible: true },
    { platform: "X", url: "https://x.com", visible: true },
  ],
};

function darkenHex(hex: string, amount = 0.12) {
  if (!HEX_PATTERN.test(hex)) return hex;
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, ((n >> 16) & 255) * (1 - amount));
  const g = Math.max(0, ((n >> 8) & 255) * (1 - amount));
  const b = Math.max(0, (n & 255) * (1 - amount));
  return `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;
}

export function GeneralSettings() {
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const { data: siteSettings, isLoading, saveMutation } = useAdminSiteSettings();
  const [logoPreview, setLogoPreview] = useState<string | null>(DEFAULT_SITE_SETTINGS.logoUrl);
  const [faviconPreview, setFaviconPreview] = useState<string | null>(
    DEFAULT_SITE_SETTINGS.faviconUrl,
  );
  const logoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);
  const logoFileRef = useRef<File | null>(null);
  const faviconFileRef = useRef<File | null>(null);

  const {
    control,
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<GeneralSettingsFormValues>({
    defaultValues,
    mode: "onBlur",
  });

  useEffect(() => {
    if (!siteSettings) return;
    reset({
      brandColor: siteSettings.primaryColor,
      shortDescription: siteSettings.shopShortDescription,
      tagline: siteSettings.shopTagline,
      copyrightText: siteSettings.copyrightText,
      socialLinks: siteSettings.socialLinks.map((link) => ({
        platform: (SOCIAL_PLATFORMS.includes(link.platform as (typeof SOCIAL_PLATFORMS)[number])
          ? link.platform
          : "Instagram") as SocialLinkForm["platform"],
        url: link.url,
        visible: link.visible,
      })),
    });
    if (!logoFileRef.current) setLogoPreview(siteSettings.logoUrl || null);
    if (!faviconFileRef.current) setFaviconPreview(siteSettings.faviconUrl || null);
  }, [siteSettings, reset]);

  const { fields, append, remove } = useFieldArray({
    control,
    name: "socialLinks",
  });

  const brandColor = watch("brandColor");
  const hoverColor = darkenHex(brandColor || ADMIN_ACCENT);

  function onFileChange(
    event: ChangeEvent<HTMLInputElement>,
    setter: (url: string) => void,
    fileRef: { current: File | null },
  ) {
    const file = event.target.files?.[0];
    if (!file?.type.startsWith("image/")) return;
    fileRef.current = file;
    setter(URL.createObjectURL(file));
  }

  async function onSubmit(values: GeneralSettingsFormValues) {
    setSaveError(null);
    try {
      let logoUrl = siteSettings?.logoUrl ?? "";
      let faviconUrl = siteSettings?.faviconUrl ?? "";

      if (logoFileRef.current) {
        logoUrl = await uploadImageToImageKit(logoFileRef.current, "/hidden-urban/brand");
      }
      if (faviconFileRef.current) {
        faviconUrl = await uploadImageToImageKit(
          faviconFileRef.current,
          "/hidden-urban/brand",
        );
      }

      const saved = await saveMutation.mutateAsync({
        primaryColor: values.brandColor,
        shopShortDescription: values.shortDescription,
        shopTagline: values.tagline,
        copyrightText: values.copyrightText,
        socialLinks: values.socialLinks,
        logoUrl,
        faviconUrl,
      });

      logoFileRef.current = null;
      faviconFileRef.current = null;
      setLogoPreview(saved.logoUrl || null);
      setFaviconPreview(saved.faviconUrl || null);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : "Could not save settings. Try again.",
      );
    }
  }

  return (
    <Box sx={{ width: "100%", minWidth: 0 }}>
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          alignItems: { sm: "flex-start" },
          justifyContent: "space-between",
          gap: 2,
          mb: 2.5,
        }}
      >
        <Box>
          <Typography
            sx={{
              fontSize: "0.7rem",
              fontWeight: 700,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: ADMIN_ACCENT,
            }}
          >
            Settings
          </Typography>
          <Typography
            sx={{
              mt: 0.5,
              fontSize: { xs: "1.35rem", sm: "1.5rem" },
              fontWeight: 700,
              letterSpacing: "-0.02em",
            }}
          >
            General
          </Typography>
          <Typography sx={{ mt: 0.5, fontSize: "0.9rem", color: "text.secondary" }}>
            Manage logo, favicon, brand color, and footer content.
          </Typography>
        </Box>

        <Button
          variant="contained"
          startIcon={<SaveOutlinedIcon />}
          onClick={handleSubmit(onSubmit)}
          disabled={isSubmitting || isLoading || saveMutation.isPending}
          sx={{
            flexShrink: 0,
            bgcolor: ADMIN_ACCENT,
            fontWeight: 600,
            textTransform: "none",
            px: 2.5,
            "&:hover": { bgcolor: "#185a4a" },
          }}
        >
          Save
        </Button>
      </Box>

      {saveError ? (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 1 }}>
          {saveError}
        </Alert>
      ) : null}

      {saved ? (
        <Alert severity="success" sx={{ mb: 2, borderRadius: 1 }}>
          General settings saved.
        </Alert>
      ) : null}

      <Stack spacing={2}>
        <SettingsSection
          title="Logo & favicon"
          description="Shown in the navbar, footer, admin sidebar, and browser tab. Upload a new file, then Save."
        >
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography
                sx={{
                  fontSize: "0.65rem",
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  color: "text.secondary",
                  mb: 1,
                }}
              >
                Shop logo
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 1.5 }}>
                <Box
                  sx={{
                    width: 72,
                    height: 72,
                    borderRadius: 1,
                    border: "1px solid",
                    borderColor: "divider",
                    display: "grid",
                    placeItems: "center",
                    bgcolor: "#f8fafc",
                    overflow: "hidden",
                  }}
                >
                  {logoPreview ? (
                    <Box
                      component="img"
                      src={logoPreview}
                      alt="Logo preview"
                      sx={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
                    />
                  ) : (
                    <Typography sx={{ fontWeight: 800, color: ADMIN_ACCENT, fontSize: "0.85rem" }}>
                      EF
                    </Typography>
                  )}
                </Box>
                <Button
                  variant="outlined"
                  startIcon={<UploadFileOutlinedIcon />}
                  onClick={() => logoInputRef.current?.click()}
                  sx={{
                    borderColor: ADMIN_ACCENT,
                    color: ADMIN_ACCENT,
                    fontWeight: 600,
                    textTransform: "none",
                  }}
                >
                  Upload logo
                </Button>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => onFileChange(e, setLogoPreview, logoFileRef)}
                />
              </Box>
              <Typography sx={{ fontSize: "0.75rem", color: "text.secondary" }}>
                PNG, JPG, SVG — transparent background preferred.
              </Typography>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Typography
                sx={{
                  fontSize: "0.65rem",
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  color: "text.secondary",
                  mb: 1,
                }}
              >
                Favicon
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 1.5 }}>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 1,
                    border: "1px solid",
                    borderColor: "divider",
                    display: "grid",
                    placeItems: "center",
                    bgcolor: ADMIN_ACCENT,
                    color: "#fff",
                    fontWeight: 800,
                    fontSize: "0.75rem",
                    overflow: "hidden",
                  }}
                >
                  {faviconPreview ? (
                    <Box
                      component="img"
                      src={faviconPreview}
                      alt="Favicon preview"
                      sx={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : (
                    "EF"
                  )}
                </Box>
                <Button
                  variant="outlined"
                  startIcon={<UploadFileOutlinedIcon />}
                  onClick={() => faviconInputRef.current?.click()}
                  sx={{
                    borderColor: ADMIN_ACCENT,
                    color: ADMIN_ACCENT,
                    fontWeight: 600,
                    textTransform: "none",
                  }}
                >
                  Upload favicon
                </Button>
                <input
                  ref={faviconInputRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => onFileChange(e, setFaviconPreview, faviconFileRef)}
                />
              </Box>
              <Typography sx={{ fontSize: "0.75rem", color: "text.secondary" }}>
                32×32 or 64×64 PNG/ICO recommended — browser tab icon.
              </Typography>
            </Grid>
          </Grid>
        </SettingsSection>

        <Grid container spacing={2}>
          <Grid size={{ xs: 12, lg: 6 }}>
            <SettingsSection
              title="Brand color"
              description="Updates buttons, navbar, links, and accent colors."
            >
              <Stack spacing={2}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: 1,
                      bgcolor: brandColor,
                      border: "1px solid rgba(0,0,0,0.1)",
                      flexShrink: 0,
                    }}
                  />
                  <TextField
                    label="Hex color"
                    fullWidth
                    error={Boolean(errors.brandColor)}
                    helperText={errors.brandColor?.message}
                    {...register("brandColor", {
                      required: "Color is required",
                      pattern: {
                        value: HEX_PATTERN,
                        message: "Use a valid hex color (e.g. #1f6f5b)",
                      },
                    })}
                  />
                </Box>

                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                  {BRAND_PRESETS.map((preset) => (
                    <Chip
                      key={preset.value}
                      label={preset.label}
                      onClick={() =>
                        setValue("brandColor", preset.value, { shouldValidate: true })
                      }
                      sx={{
                        fontWeight: 600,
                        border:
                          brandColor === preset.value
                            ? `2px solid ${preset.value}`
                            : "1px solid #e2e8f0",
                        bgcolor: brandColor === preset.value ? `${preset.value}18` : "#fff",
                        "&::before": {
                          content: '""',
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          bgcolor: preset.value,
                          mr: 0.5,
                        },
                      }}
                    />
                  ))}
                </Box>

                <Box
                  sx={{
                    borderRadius: 1.5,
                    bgcolor: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    p: 2,
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: "0.65rem",
                      fontWeight: 700,
                      letterSpacing: "0.12em",
                      color: "text.secondary",
                      mb: 1.5,
                    }}
                  >
                    Preview
                  </Typography>
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, alignItems: "center" }}>
                    <Button
                      variant="contained"
                      disableElevation
                      sx={{
                        bgcolor: brandColor,
                        textTransform: "none",
                        fontWeight: 600,
                        "&:hover": { bgcolor: hoverColor },
                      }}
                    >
                      Primary button
                    </Button>
                    <Button
                      variant="contained"
                      disableElevation
                      sx={{
                        bgcolor: hoverColor,
                        textTransform: "none",
                        fontWeight: 600,
                      }}
                    >
                      Hover
                    </Button>
                    <Chip
                      label="Soft badge"
                      sx={{
                        fontWeight: 600,
                        bgcolor: `${brandColor}22`,
                        color: brandColor,
                        border: `1px solid ${brandColor}44`,
                      }}
                    />
                  </Box>
                </Box>
              </Stack>
            </SettingsSection>
          </Grid>

          <Grid size={{ xs: 12, lg: 6 }}>
            <SettingsSection
              title="Shop content"
              description="Edit the footer short description, tagline, and copyright text."
            >
              <Stack spacing={2}>
                <TextField
                  label="Short description"
                  fullWidth
                  multiline
                  minRows={3}
                  error={Boolean(errors.shortDescription)}
                  helperText={errors.shortDescription?.message}
                  {...register("shortDescription", {
                    required: "Short description is required",
                    minLength: { value: 20, message: "Add more detail" },
                  })}
                />
                <TextField
                  label="Tagline"
                  fullWidth
                  error={Boolean(errors.tagline)}
                  helperText={errors.tagline?.message}
                  {...register("tagline", { required: "Tagline is required" })}
                />
                <TextField
                  label="Copyright text"
                  fullWidth
                  error={Boolean(errors.copyrightText)}
                  helperText={
                    errors.copyrightText?.message ??
                    "Use {year} to insert the current year automatically."
                  }
                  {...register("copyrightText", { required: "Copyright text is required" })}
                />
              </Stack>
            </SettingsSection>
          </Grid>
        </Grid>

        <SettingsSection
          title="Social links"
          description="Shown in the footer. Links without a URL stay disabled."
          headerAction={
            <Button
              size="small"
              variant="outlined"
              startIcon={<AddRoundedIcon />}
              onClick={() =>
                append({ platform: "Facebook", url: "", visible: true })
              }
              sx={{
                borderColor: ADMIN_ACCENT,
                color: ADMIN_ACCENT,
                fontWeight: 600,
                textTransform: "none",
                flexShrink: 0,
              }}
            >
              Add link
            </Button>
          }
        >
          <Stack spacing={2}>
            {fields.map((field, index) => (
              <Box
                key={field.id}
                sx={{
                  display: "grid",
                  gap: 1.5,
                  gridTemplateColumns: {
                    xs: "1fr",
                    md: "160px 1fr auto auto",
                  },
                  alignItems: "center",
                  p: 1.5,
                  borderRadius: 1,
                  border: "1px solid",
                  borderColor: "rgba(0,0,0,0.08)",
                  bgcolor: "#fafafa",
                }}
              >
                <Controller
                  name={`socialLinks.${index}.platform`}
                  control={control}
                  render={({ field: platformField }) => (
                    <FormControl fullWidth size="small">
                      <InputLabel id={`platform-${index}`}>Platform</InputLabel>
                      <Select
                        {...platformField}
                        labelId={`platform-${index}`}
                        label="Platform"
                      >
                        {SOCIAL_PLATFORMS.map((p) => (
                          <MenuItem key={p} value={p}>
                            {p}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                />
                <TextField
                  label="URL"
                  fullWidth
                  size="small"
                  {...register(`socialLinks.${index}.url` as const)}
                />
                <Controller
                  name={`socialLinks.${index}.visible`}
                  control={control}
                  render={({ field: visibleField }) => (
                    <FormControlLabel
                      control={
                        <Switch
                          checked={visibleField.value}
                          onChange={(_, checked) => visibleField.onChange(checked)}
                          color="primary"
                        />
                      }
                      label="Show"
                    />
                  )}
                />
                <Button
                  color="error"
                  startIcon={<DeleteOutlineRoundedIcon />}
                  onClick={() => remove(index)}
                  sx={{ textTransform: "none", fontWeight: 600, justifySelf: { md: "end" } }}
                >
                  Remove
                </Button>
              </Box>
            ))}
          </Stack>
        </SettingsSection>
      </Stack>
    </Box>
  );
}
