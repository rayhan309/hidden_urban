import { BD_REGIONS } from "@/lib/constants/locations";
import type { AdminOrder } from "@/types/admin-order";

/** English labels Meta and TikTok location search expect. */
const ADS_NAMES: Record<string, string> = {
  Chattogram: "Chittagong",
  Cumilla: "Comilla",
  Barishal: "Barisal",
  Bogura: "Bogra",
  Jhalokathi: "Jhalokati",
};

const ALIASES: Record<string, string> = {
  chittagong: "Chattogram",
  comilla: "Cumilla",
  barisal: "Barishal",
  bogra: "Bogura",
  jashore: "Jessore",
  jhalokati: "Jhalokathi",
  "cox s bazar": "Cox's Bazar",
  "coxs bazar": "Cox's Bazar",
  "chapai nawabganj": "Chapainawabganj",
};

export type LocationPlace = {
  district: string;
  division: string;
  adsName: string;
};

export type DistrictLocationRow = LocationPlace & {
  orders: number;
  revenue: number;
  share: number;
};

export type DivisionLocationRow = {
  division: string;
  orders: number;
  revenue: number;
  share: number;
};

export type LocationReport = {
  activeOrders: number;
  matchedOrders: number;
  unmatchedOrders: number;
  matchRate: number;
  revenue: number;
  districts: DistrictLocationRow[];
  divisions: DivisionLocationRow[];
};

type Place = LocationPlace;

function normalize(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/['’.]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function adsNameFor(district: string) {
  return ADS_NAMES[district] ?? district;
}

const placesByKey = new Map<string, Place>();

for (const [division, districts] of Object.entries(BD_REGIONS)) {
  for (const district of districts) {
    const place: Place = { district, division, adsName: adsNameFor(district) };
    placesByKey.set(normalize(district), place);
  }
}

for (const [alias, district] of Object.entries(ALIASES)) {
  const place = placesByKey.get(normalize(district));
  if (place) placesByKey.set(normalize(alias), place);
}

const searchKeys = [...placesByKey.keys()].sort((a, b) => b.length - a.length);

function placeFromText(value: string): Place | null {
  const key = normalize(value);
  if (!key) return null;
  return placesByKey.get(key) ?? null;
}

function placeFromAddress(value: string): Place | null {
  const haystack = normalize(value);
  if (!haystack) return null;
  for (const key of searchKeys) {
    if (key.length < 4) continue;
    if (haystack.includes(key)) return placesByKey.get(key) ?? null;
  }
  return null;
}

export function placeForOrder(order: AdminOrder): Place | null {
  return (
    placeFromText(order.customerCity ?? "") ??
    placeFromAddress(
      [order.customerAddress, order.customerCity, order.customerRegion].filter(Boolean).join(" "),
    )
  );
}

export function buildLocationReport(orders: AdminOrder[]): LocationReport {
  const active = orders.filter((order) => order.status !== "cancelled");
  const counts = new Map<string, { place: Place; orders: number; revenue: number }>();
  let matchedOrders = 0;

  for (const order of active) {
    const place = placeForOrder(order);
    if (!place) continue;
    matchedOrders += 1;
    const current = counts.get(place.district) ?? { place, orders: 0, revenue: 0 };
    current.orders += 1;
    current.revenue += Number(order.total) || 0;
    counts.set(place.district, current);
  }

  const unmatchedOrders = active.length - matchedOrders;
  const districts = Array.from(counts.values())
    .map((row) => ({
      ...row.place,
      orders: row.orders,
      revenue: row.revenue,
      share: matchedOrders > 0 ? (row.orders / matchedOrders) * 100 : 0,
    }))
    .sort((a, b) => b.orders - a.orders || b.revenue - a.revenue);

  const divisionCounts = new Map<string, { orders: number; revenue: number }>();
  for (const row of districts) {
    const current = divisionCounts.get(row.division) ?? { orders: 0, revenue: 0 };
    current.orders += row.orders;
    current.revenue += row.revenue;
    divisionCounts.set(row.division, current);
  }

  const divisions = Array.from(divisionCounts.entries())
    .map(([division, row]) => ({
      division,
      orders: row.orders,
      revenue: row.revenue,
      share: matchedOrders > 0 ? (row.orders / matchedOrders) * 100 : 0,
    }))
    .sort((a, b) => b.orders - a.orders);

  return {
    activeOrders: active.length,
    matchedOrders,
    unmatchedOrders,
    matchRate: active.length > 0 ? (matchedOrders / active.length) * 100 : 0,
    revenue: districts.reduce((sum, row) => sum + row.revenue, 0),
    districts,
    divisions,
  };
}

export function topLocationAdsNames(report: LocationReport, limit = 10) {
  return report.districts.slice(0, limit).map((row) => row.adsName);
}
