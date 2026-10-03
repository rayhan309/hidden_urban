export function normalizeClientIp(value: string): string {
  let ip = value.trim();
  if (ip.startsWith("::ffff:")) ip = ip.slice(7);
  return ip;
}

export function isLocalIp(ip: string): boolean {
  const value = normalizeClientIp(ip).toLowerCase();
  if (!value || value === "::1" || value === "0.0.0.0" || value === "::") return true;
  if (value.startsWith("127.") || value.startsWith("10.") || value.startsWith("192.168.")) {
    return true;
  }
  if (value.startsWith("169.254.") || value.startsWith("fe80:")) return true;
  if (value.includes(":") && (value.startsWith("fc") || value.startsWith("fd"))) return true;
  const match = /^172\.(\d+)\./.exec(value);
  if (!match) return false;
  const second = Number(match[1]);
  return second >= 16 && second <= 31;
}

export function clientIpFromHeaders(headers: Headers): string | undefined {
  const candidates = [
    headers.get("cf-connecting-ip"),
    headers.get("x-real-ip"),
    headers.get("x-forwarded-for")?.split(",")[0],
  ];

  for (const candidate of candidates) {
    const ip = candidate ? normalizeClientIp(candidate) : "";
    if (ip) return ip;
  }
  return undefined;
}
