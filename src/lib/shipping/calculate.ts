import type { PublicSiteSettings, SiteSettings } from "@/types/site-settings";

type ShippingSettingsSlice = Pick<
  SiteSettings,
  | "freeDeliveryEnabled"
  | "freeDeliveryMinimum"
  | "shippingAreas"
  | "shippingClasses"
>;

/** Prefer the first configured shipping class (admin rate card). */
export function resolveShippingFee(
  settings: ShippingSettingsSlice,
  areaIndex: number,
  subtotal: number,
): number {
  if (
    settings.freeDeliveryEnabled &&
    settings.freeDeliveryMinimum > 0 &&
    subtotal >= settings.freeDeliveryMinimum
  ) {
    return 0;
  }

  const shippingClass = settings.shippingClasses[0];
  if (!shippingClass) return 0;
  if (shippingClass.freeDelivery) return 0;

  const safeIndex = Math.min(
    Math.max(0, areaIndex),
    Math.max(0, settings.shippingAreas.length - 1),
  );
  const fee = Number(shippingClass.fees[safeIndex] ?? shippingClass.fees[0] ?? 0);
  return Number.isFinite(fee) && fee > 0 ? fee : 0;
}

/** Cart estimate before a delivery area is chosen. */
export function estimateDefaultShippingFee(
  settings: ShippingSettingsSlice,
  subtotal: number,
): number {
  return resolveShippingFee(settings, 0, subtotal);
}

function areaLooksInside(area: { id: string; name: string }): boolean {
  const id = area.id.toLowerCase();
  const name = area.name.toLowerCase();
  return id.includes("inside") || name.includes("inside") || area.name.includes("ভেতরে");
}

function areaLooksOutside(area: { id: string; name: string }): boolean {
  const id = area.id.toLowerCase();
  const name = area.name.toLowerCase();
  return (
    id.includes("outside") ||
    name.includes("outside") ||
    area.name.includes("বাহিরে") ||
    area.name.includes("বাইরে")
  );
}

/** Inside-Dhaka rate when the district is Dhaka; otherwise the outside rate. */
export function deliveryAreaIdForDistrict(
  areas: { id: string; name: string }[],
  district: string,
): string {
  if (!areas.length) return "";
  const insideDhaka = district.trim().toLowerCase() === "dhaka";
  const match = areas.find((area) =>
    insideDhaka ? areaLooksInside(area) : areaLooksOutside(area),
  );
  if (match) return match.id;
  return insideDhaka ? areas[0].id : areas[Math.min(1, areas.length - 1)].id;
}

export function findShippingAreaIndex(
  settings: Pick<SiteSettings, "shippingAreas">,
  areaIdOrName: string,
): number {
  const needle = areaIdOrName.trim().toLowerCase();
  if (!needle) return 0;
  const byId = settings.shippingAreas.findIndex((area) => area.id === areaIdOrName);
  if (byId >= 0) return byId;
  const byName = settings.shippingAreas.findIndex(
    (area) => area.name.trim().toLowerCase() === needle,
  );
  return byName >= 0 ? byName : 0;
}

export function shippingEstimateForArea(
  settings: Pick<
    PublicSiteSettings,
    "shippingEstimateInsideDhaka" | "shippingEstimateOutsideDhaka"
  >,
  areaIndex: number,
): string {
  return areaIndex <= 0
    ? settings.shippingEstimateInsideDhaka
    : settings.shippingEstimateOutsideDhaka;
}
