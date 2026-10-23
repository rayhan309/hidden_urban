/** Ask the CDN for a display-sized file instead of the original upload. */
export function displayImageUrl(url: string, width: number): string {
  if (!url) return url;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return url;
  }

  if (parsed.hostname === "ik.imagekit.io") {
    if (parsed.searchParams.has("tr") || parsed.pathname.includes("/tr:")) return url;
    parsed.searchParams.set("tr", `w-${width},q-75,f-auto`);
    return parsed.toString();
  }

  if (parsed.hostname === "images.unsplash.com") {
    parsed.searchParams.set("auto", "format");
    parsed.searchParams.set("fit", "crop");
    parsed.searchParams.set("w", String(width));
    parsed.searchParams.set("q", "70");
    return parsed.toString();
  }

  return url;
}
