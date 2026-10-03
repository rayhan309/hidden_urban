import { dbConnect } from "@/lib/dbConnect";
import { getSeedModel } from "@/lib/seed/seed-model";
import { DEFAULT_SITE_SETTINGS } from "@/lib/site-settings/defaults";
import { expandBrandColors } from "@/lib/site-settings/colors";
import { toPublicSiteSettings } from "@/lib/site-settings/public";
import type {
  SiteSettings,
  SiteShippingArea,
  SiteShippingClass,
  SiteSocialLink,
} from "@/types/site-settings";
import type { HeroSideBanner, HeroSlide } from "@/types/hero";

export { toPublicSiteSettings };

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function imageUrlFromField(value: unknown): string {
  if (typeof value === "string") return value;
  const o = record(value);
  return String(o.url ?? o.src ?? "");
}

function mapSocialLinks(raw: unknown): SiteSocialLink[] {
  if (!Array.isArray(raw)) return DEFAULT_SITE_SETTINGS.socialLinks;
  return raw.map((item) => {
    const row = record(item);
    return {
      platform: String(row.platform ?? ""),
      url: String(row.url ?? ""),
      visible: row.visible !== false,
    };
  });
}

function mapHeroSlides(raw: unknown): HeroSlide[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item, index) => {
      const row = record(item);
      const image = String(row.image ?? "");
      const title = String(row.title ?? "").trim();
      if (!image || !title) return null;
      return {
        id: String(row.id ?? `slide-${index}`),
        title,
        subtitle: String(row.subtitle ?? ""),
        ctaLabel: String(row.ctaLabel ?? "Shop now"),
        href: String(row.href ?? "/shop"),
        image,
        imageAlt: String(row.imageAlt ?? title),
      };
    })
    .filter((slide): slide is HeroSlide => slide !== null);
}

function mapHeroSideBanners(raw: unknown): HeroSideBanner[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item, index) => {
      const row = record(item);
      const image = String(row.image ?? "");
      const title = String(row.title ?? "").trim();
      if (!image || !title) return null;
      return {
        id: String(row.id ?? `side-${index}`),
        title,
        subtitle: String(row.subtitle ?? ""),
        href: String(row.href ?? "/shop"),
        image,
        imageAlt: String(row.imageAlt ?? title),
        tone: row.tone === "sand" ? "sand" : "forest",
      };
    })
    .filter((banner): banner is HeroSideBanner => banner !== null);
}

function mapShippingAreas(raw: unknown): SiteShippingArea[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return DEFAULT_SITE_SETTINGS.shippingAreas.map((area) => ({ ...area }));
  }
  return raw.map((item, index) => {
    const row = record(item);
    return {
      id: String(row.id ?? `area-${index}`),
      name: String(row.name ?? `Area ${index + 1}`),
    };
  });
}

function mapShippingClasses(raw: unknown, areaCount: number): SiteShippingClass[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return DEFAULT_SITE_SETTINGS.shippingClasses.map((cls) => ({
      ...cls,
      fees: [...cls.fees],
    }));
  }
  return raw.map((item, index) => {
    const row = record(item);
    const feesRaw = Array.isArray(row.fees) ? row.fees : [];
    const fees = Array.from({ length: Math.max(areaCount, 1) }, (_, feeIndex) => {
      const n = Number(feesRaw[feeIndex] ?? 0);
      return Number.isFinite(n) && n >= 0 ? n : 0;
    });
    return {
      id: String(row.id ?? `class-${index}`),
      name: String(row.name ?? `Class ${index + 1}`),
      description: String(row.description ?? ""),
      freeDelivery: Boolean(row.freeDelivery),
      fees,
    };
  });
}

function needsBrandRename(doc: Record<string, unknown>): boolean {
  const shop = String(doc.shopName ?? doc.businessName ?? "");
  const copyright = String(doc.copyrightText ?? "");
  const email = String(doc.contactEmail ?? "");
  return (
    shop === "Eco Fashion" ||
    copyright.includes("Eco Fashion") ||
    email.includes("ecofashion")
  );
}

function applyBrandRename(settings: SiteSettings): SiteSettings {
  return {
    ...settings,
    shopName: settings.shopName === "Eco Fashion" ? "Hidden Urban" : settings.shopName,
    businessName:
      settings.businessName === "Eco Fashion" ? "Hidden Urban" : settings.businessName,
    copyrightText: settings.copyrightText.replaceAll("Eco Fashion", "Hidden Urban"),
    contactEmail: settings.contactEmail.replaceAll("ecofashion.com", "hiddenurban.com"),
  };
}

export function mapSiteSettingsDoc(doc: Record<string, unknown>): SiteSettings {
  const primary =
    String(doc.primaryColor ?? doc.brandColor ?? DEFAULT_SITE_SETTINGS.primaryColor);
  const colors = expandBrandColors(primary);
  const shippingAreas = mapShippingAreas(doc.shippingAreas);
  const shippingClasses = mapShippingClasses(doc.shippingClasses, shippingAreas.length);

  const mapped: SiteSettings = {
    shopName: String(doc.shopName ?? doc.businessName ?? DEFAULT_SITE_SETTINGS.shopName),
    shopTagline: String(doc.shopTagline ?? DEFAULT_SITE_SETTINGS.shopTagline),
    shopShortDescription: String(
      doc.shopShortDescription ?? doc.shortDescription ?? DEFAULT_SITE_SETTINGS.shopShortDescription,
    ),
    copyrightText: String(doc.copyrightText ?? DEFAULT_SITE_SETTINGS.copyrightText),
    primaryColor: String(doc.primaryColor ?? colors.primaryColor),
    primaryColorHover: String(doc.primaryColorHover ?? colors.primaryColorHover),
    primaryColorDark: String(doc.primaryColorDark ?? colors.primaryColorDark),
    primaryColorSoft: String(doc.primaryColorSoft ?? colors.primaryColorSoft),
    primaryColorBorder: String(doc.primaryColorBorder ?? colors.primaryColorBorder),
    logoUrl:
      imageUrlFromField(doc.logoUrl ?? doc.logo ?? doc.shopLogo).trim() ||
      DEFAULT_SITE_SETTINGS.logoUrl,
    faviconUrl:
      imageUrlFromField(doc.faviconUrl ?? doc.favicon).trim() ||
      DEFAULT_SITE_SETTINGS.faviconUrl,
    contactEmail: String(doc.contactEmail ?? DEFAULT_SITE_SETTINGS.contactEmail),
    contactPhone: String(doc.contactPhone ?? DEFAULT_SITE_SETTINGS.contactPhone),
    contactAddress: String(doc.contactAddress ?? doc.address ?? DEFAULT_SITE_SETTINGS.contactAddress),
    businessName: String(doc.businessName ?? doc.shopName ?? DEFAULT_SITE_SETTINGS.businessName),
    city: String(doc.city ?? DEFAULT_SITE_SETTINGS.city),
    supportHours: String(doc.supportHours ?? DEFAULT_SITE_SETTINGS.supportHours),
    supportNote: String(doc.supportNote ?? DEFAULT_SITE_SETTINGS.supportNote),
    freeDeliveryEnabled:
      doc.freeDeliveryEnabled === undefined
        ? DEFAULT_SITE_SETTINGS.freeDeliveryEnabled
        : Boolean(doc.freeDeliveryEnabled),
    freeDeliveryMinimum: Number(doc.freeDeliveryMinimum ?? DEFAULT_SITE_SETTINGS.freeDeliveryMinimum),
    shippingEstimateInsideDhaka: String(
      doc.shippingEstimateInsideDhaka ?? DEFAULT_SITE_SETTINGS.shippingEstimateInsideDhaka,
    ),
    shippingEstimateOutsideDhaka: String(
      doc.shippingEstimateOutsideDhaka ?? DEFAULT_SITE_SETTINGS.shippingEstimateOutsideDhaka,
    ),
    shippingAreas,
    shippingClasses,
    heroSlides: mapHeroSlides(doc.heroSlides),
    heroSideBanners: mapHeroSideBanners(doc.heroSideBanners),
    socialLinks: mapSocialLinks(doc.socialLinks),
    metaPixelEnabled: Boolean(doc.metaPixelEnabled ?? false),
    metaPixelId: String(doc.metaPixelId ?? ""),
    metaCapiEnabled: Boolean(doc.metaCapiEnabled ?? false),
    metaCapiToken: String(doc.metaCapiToken ?? ""),
    metaCapiTestEventCode: String(doc.metaCapiTestEventCode ?? ""),
    tiktokPixelEnabled: Boolean(doc.tiktokPixelEnabled ?? false),
    tiktokPixelId: String(doc.tiktokPixelId ?? ""),
    tiktokCapiEnabled: Boolean(doc.tiktokCapiEnabled ?? false),
    tiktokCapiToken: String(doc.tiktokCapiToken ?? ""),
    tiktokCapiTestEventCode: String(doc.tiktokCapiTestEventCode ?? ""),
    steadfastEnabled: Boolean(doc.steadfastEnabled ?? false),
    steadfastBaseUrl: String(doc.steadfastBaseUrl ?? DEFAULT_SITE_SETTINGS.steadfastBaseUrl),
    steadfastApiKey: String(doc.steadfastApiKey ?? ""),
    steadfastSecretKey: String(doc.steadfastSecretKey ?? ""),
  };

  return needsBrandRename(doc) ? applyBrandRename(mapped) : mapped;
}

export async function readSiteSettingsFromDb(): Promise<SiteSettings | null> {
  await dbConnect();
  const Model = getSeedModel("site_settings");
  const doc = await Model.findOne({ legacyId: "global" }).lean();
  if (!doc) return null;
  return mapSiteSettingsDoc(doc as unknown as Record<string, unknown>);
}

export async function getSiteSettingsFromDbOrFallback(): Promise<SiteSettings> {
  try {
    const fromDb = await readSiteSettingsFromDb();
    if (fromDb) return fromDb;
  } catch (error) {
    console.error("[db] site_settings read failed:", error);
  }
  return {
    ...DEFAULT_SITE_SETTINGS,
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
