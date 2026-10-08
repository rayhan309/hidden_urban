export function normalizeClientIp(value: string): string {
  let ip = value.trim();
  if (ip.startsWith("::ffff:")) ip = ip.slice(7);
  return ip;
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
