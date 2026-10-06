"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { trackPixelEvent } from "@/lib/pixel/track";

type SiteSettingsRootProps = {
  children: ReactNode;
};

export function SiteSettingsRoot({ children }: SiteSettingsRootProps) {
  const settings = useSiteSettings();
  const pathname = usePathname();
  const lastPath = useRef<string | null>(null);
  const skipFirst = useRef(true);

  const metaOn = settings.metaPixelEnabled && Boolean(settings.metaPixelId.trim());
  const tiktokOn = settings.tiktokPixelEnabled && Boolean(settings.tiktokPixelId.trim());
  const metaCapiOn =
    settings.metaCapiEnabled ||
    Boolean((settings.metaCapiTestEventCode ?? "").trim());
  const tiktokCapiOn =
    settings.tiktokCapiEnabled ||
    Boolean((settings.tiktokCapiTestEventCode ?? "").trim());

  useEffect(() => {
    const href = settings.faviconUrl.trim();
    if (!href) return;
    const target = new URL(href, window.location.origin).href;

    function matches(link: HTMLLinkElement) {
      return link.href === target;
    }

    function upsert(rel: string) {
      let link = document.querySelector<HTMLLinkElement>(`link[rel='${rel}']`);
      if (!link) {
        link = document.createElement("link");
        link.rel = rel;
        document.head.appendChild(link);
      }
      if (!matches(link)) link.href = href;
    }

    upsert("icon");
    upsert("apple-touch-icon");
  }, [settings.faviconUrl]);

  // Base PageView is fired by server-rendered TrackingPixels (ttq.page / fbq PageView).
  // This effect covers SPA navigations + CAPI with shared event_id.
  useEffect(() => {
    if (!metaOn && !tiktokOn && !metaCapiOn && !tiktokCapiOn) {
      return;
    }

    // First paint: base pixel already called page()/PageView — only send CAPI once.
    if (skipFirst.current) {
      skipFirst.current = false;
      lastPath.current = pathname;
      const timer = window.setTimeout(() => {
        void trackPixelEvent({ eventName: "PageView", skipBrowser: true });
      }, 250);
      return () => window.clearTimeout(timer);
    }

    if (lastPath.current === pathname) return;
    lastPath.current = pathname;

    const timer = window.setTimeout(() => {
      // One PageView with a shared event id. A separate ttq.page() here was a second hit TikTok could not dedupe.
      void trackPixelEvent({ eventName: "PageView" });
    }, 200);

    return () => window.clearTimeout(timer);
  }, [pathname, metaOn, tiktokOn, metaCapiOn, tiktokCapiOn]);

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `:root {
  --eco-primary: ${settings.primaryColor};
  --eco-primary-hover: ${settings.primaryColorHover};
  --eco-primary-dark: ${settings.primaryColorDark};
  --eco-primary-soft: ${settings.primaryColorSoft};
  --eco-primary-border: ${settings.primaryColorBorder};
}`,
        }}
      />
      {children}
    </>
  );
}
