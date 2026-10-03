import { ADMIN_ACCENT } from "@/lib/constants/admin";
import type { SiteSettings } from "@/types/site-settings";
import { expandBrandColors } from "@/lib/site-settings/colors";

const baseColor = ADMIN_ACCENT;
const colors = expandBrandColors(baseColor);

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  shopName: "Hidden Urban",
  shopTagline: "Made for modern men",
  shopShortDescription:
    "Men's fashion built for everyday clarity — thoughtful cuts, lasting fabrics, and pieces that work harder in your wardrobe.",
  copyrightText: "© {year} Hidden Urban. All rights reserved.",
  primaryColor: colors.primaryColor,
  primaryColorHover: colors.primaryColorHover,
  primaryColorDark: colors.primaryColorDark,
  primaryColorSoft: colors.primaryColorSoft,
  primaryColorBorder: colors.primaryColorBorder,
  logoUrl: "/brand/hidden-urban-logo.jpg",
  faviconUrl: "/brand/hidden-urban-logo.jpg",
  contactEmail: "hello@hiddenurban.com",
  contactPhone: "01700000000",
  contactAddress: "House 12, Road 5, Dhanmondi",
  businessName: "Hidden Urban",
  city: "Dhaka",
  supportHours: "Sat–Thu, 10:00–19:00",
  supportNote: "Our support team is here for sizing, orders, and delivery questions.",
  freeDeliveryEnabled: true,
  freeDeliveryMinimum: 5000,
  shippingEstimateInsideDhaka: "1–2 business days",
  shippingEstimateOutsideDhaka: "2–4 business days",
  shippingAreas: [
    { id: "area-inside-dhaka", name: "ঢাকার ভেতরে" },
    { id: "area-outside-dhaka", name: "ঢাকার বাহিরে" },
  ],
  shippingClasses: [
    {
      id: "class-standard",
      name: "Standard",
      description: "Default shipping class",
      freeDelivery: false,
      fees: [60, 120],
    },
  ],
  heroSlides: [],
  heroSideBanners: [],
  socialLinks: [
    { platform: "Instagram", url: "https://instagram.com", visible: true },
    { platform: "Facebook", url: "https://facebook.com", visible: true },
    { platform: "X", url: "https://x.com", visible: true },
  ],
  metaPixelEnabled: false,
  metaPixelId: "",
  metaCapiEnabled: false,
  metaCapiToken: "",
  metaCapiTestEventCode: "",
  tiktokPixelEnabled: false,
  tiktokPixelId: "",
  tiktokCapiEnabled: false,
  tiktokCapiToken: "",
  tiktokCapiTestEventCode: "",
  steadfastEnabled: false,
  steadfastBaseUrl: "https://portal.packzy.com/api/v1",
  steadfastApiKey: "",
  steadfastSecretKey: "",
};
