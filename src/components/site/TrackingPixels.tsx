import { getPublicSiteSettings } from "@/services/site-settings";

function metaPixelSnippet(pixelId: string) {
  const id = pixelId.replace(/'/g, "");
  return `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;(b.head||b.documentElement).appendChild(t)}(window,
document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init','${id}');fbq('track','PageView');`;
}

function tiktokPixelSnippet(pixelId: string) {
  const id = pixelId.replace(/'/g, "");
  return `!function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie","holdConsent","revokeConsent","grantConsent"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var r="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=r,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};n=document.createElement("script");n.type="text/javascript";n.async=!0;n.src=r+"?sdkid="+e+"&lib="+t;(document.head||document.documentElement).appendChild(n)};ttq.load('${id}');ttq.page();}(window,document,'ttq');`;
}

/**
 * Real <script> tags in <body> so TikTok/Meta Pixel Helper can detect them.
 * next/script afterInteractive was only landing in the RSC flight payload.
 * Library tags are appended to <head> and do not splice React-owned nodes.
 */
export async function TrackingPixels() {
  const settings = await getPublicSiteSettings();

  const metaId = settings.metaPixelId.trim();
  const tiktokId = settings.tiktokPixelId.trim();
  const metaOn = settings.metaPixelEnabled && Boolean(metaId);
  const tiktokOn = settings.tiktokPixelEnabled && Boolean(tiktokId);

  if (!metaOn && !tiktokOn) return null;

  return (
    <>
      {metaOn ? (
        <>
          <script
            id="meta-pixel-base"
            dangerouslySetInnerHTML={{ __html: metaPixelSnippet(metaId) }}
          />
          <noscript>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              height="1"
              width="1"
              style={{ display: "none" }}
              src={`https://www.facebook.com/tr?id=${encodeURIComponent(metaId)}&ev=PageView&noscript=1`}
              alt=""
            />
          </noscript>
        </>
      ) : null}

      {tiktokOn ? (
        <script
          id="tiktok-pixel-base"
          dangerouslySetInnerHTML={{ __html: tiktokPixelSnippet(tiktokId) }}
        />
      ) : null}
    </>
  );
}
