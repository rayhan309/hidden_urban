import { clientIpFromHeaders, isLocalIp } from "@/lib/geo/client-ip";

export { clientIpFromHeaders, isLocalIp };

const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const MISS_TTL_MS = 60 * 1000;

type CacheEntry = { code: string | null; expires: number };

const countryCache = new Map<string, CacheEntry>();

function countryFromPlatformHeaders(headers: Headers): string | null {
  const vercel = headers.get("x-vercel-ip-country")?.trim().toUpperCase();
  if (vercel && vercel !== "XX") return vercel;

  const cloudflare = headers.get("cf-ipcountry")?.trim().toUpperCase();
  if (headers.get("cf-ray") && cloudflare && cloudflare !== "XX" && cloudflare !== "T1") {
    return cloudflare;
  }
  return null;
}

async function readCountry(url: string, parse: (body: string) => string | null): Promise<string | null> {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(4000),
      headers: { Accept: "application/json, text/plain" },
      cache: "no-store",
    });
    if (!response.ok) return null;
    return parse(await response.text());
  } catch {
    return null;
  }
}

function countryCode(value: string): string | null {
  const code = value.trim().toUpperCase();
  return /^[A-Z]{2}$/.test(code) ? code : null;
}

async function lookupCountryCode(ip: string): Promise<string | null> {
  const cached = countryCache.get(ip);
  if (cached && cached.expires > Date.now()) return cached.code;

  const encoded = encodeURIComponent(ip);
  const code =
    (await readCountry(`https://get.geojs.io/v1/ip/country/${encoded}`, countryCode)) ??
    (await readCountry(`https://ipwho.is/${encoded}`, (body) => {
      try {
        const parsed = JSON.parse(body) as { success?: boolean; country_code?: string };
        if (!parsed.success) return null;
        return countryCode(String(parsed.country_code ?? ""));
      } catch {
        return null;
      }
    }));

  countryCache.set(ip, {
    code,
    expires: Date.now() + (code ? CACHE_TTL_MS : MISS_TTL_MS),
  });
  return code;
}

export async function canPlaceOrderFromHeaders(headers: Headers): Promise<boolean> {
  const ip = clientIpFromHeaders(headers);
  if (ip && !isLocalIp(ip)) {
    const country = await lookupCountryCode(ip);
    if (country) return country === "BD";
  }

  const platformCountry = countryFromPlatformHeaders(headers);
  if (platformCountry) return platformCountry === "BD";

  return process.env.NODE_ENV !== "production" && (!ip || isLocalIp(ip));
}

