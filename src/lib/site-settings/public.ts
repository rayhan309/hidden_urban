import { DEFAULT_SITE_SETTINGS } from "@/lib/site-settings/defaults";
import type { PublicSiteSettings, SiteSettings } from "@/types/site-settings";

export function toPublicSiteSettings(settings: SiteSettings): PublicSiteSettings {
  const {
    steadfastApiKey: _a,
    steadfastSecretKey: _b,
    metaCapiToken: _c,
    tiktokCapiToken: _d,
    ...rest
  } = settings;
  return normalizePublicSiteSettings(rest);
}

/** Fill missing shipping fields from defaults (older cache / DB docs). */
export function normalizePublicSiteSettings(
  settings: Partial<PublicSiteSettings> | null | undefined,
): PublicSiteSettings {
  const base = toPublicDefaults();
  if (!settings) return base;

  const shippingAreas =
    Array.isArray(settings.shippingAreas) && settings.shippingAreas.length > 0
      ? settings.shippingAreas
      : base.shippingAreas;

  const shippingClasses =
    Array.isArray(settings.shippingClasses) && settings.shippingClasses.length > 0
      ? settings.shippingClasses
      : base.shippingClasses;

  return {
    ...base,
    ...settings,
    logoUrl: settings.logoUrl?.trim() || base.logoUrl,
    faviconUrl: settings.faviconUrl?.trim() || base.faviconUrl,
    socialLinks: Array.isArray(settings.socialLinks)
      ? settings.socialLinks
      : base.socialLinks,
    shippingAreas,
    shippingClasses,
    heroSlides: Array.isArray(settings.heroSlides) ? settings.heroSlides : [],
    heroSideBanners: Array.isArray(settings.heroSideBanners)
      ? settings.heroSideBanners
      : [],
    freeDeliveryEnabled:
      settings.freeDeliveryEnabled === undefined
        ? base.freeDeliveryEnabled
        : Boolean(settings.freeDeliveryEnabled),
    freeDeliveryMinimum: Number(
      settings.freeDeliveryMinimum ?? base.freeDeliveryMinimum,
    ),
    shippingEstimateInsideDhaka:
      settings.shippingEstimateInsideDhaka ?? base.shippingEstimateInsideDhaka,
    shippingEstimateOutsideDhaka:
      settings.shippingEstimateOutsideDhaka ?? base.shippingEstimateOutsideDhaka,
  };
}

function toPublicDefaults(): PublicSiteSettings {
  const {
    steadfastApiKey: _a,
    steadfastSecretKey: _b,
    metaCapiToken: _c,
    tiktokCapiToken: _d,
    ...rest
  } = DEFAULT_SITE_SETTINGS;
  return {
    ...rest,
    shippingAreas: DEFAULT_SITE_SETTINGS.shippingAreas.map((area) => ({ ...area })),
    shippingClasses: DEFAULT_SITE_SETTINGS.shippingClasses.map((cls) => ({
      ...cls,
      fees: [...cls.fees],
    })),
    socialLinks: DEFAULT_SITE_SETTINGS.socialLinks.map((link) => ({ ...link })),
    heroSlides: [],
    heroSideBanners: [],
  };
}

export const DEFAULT_PUBLIC_SITE_SETTINGS: PublicSiteSettings = toPublicDefaults();
