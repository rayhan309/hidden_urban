"use client";

import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import FacebookOutlinedIcon from "@mui/icons-material/FacebookOutlined";
import InstagramIcon from "@mui/icons-material/Instagram";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";
import PhoneOutlinedIcon from "@mui/icons-material/PhoneOutlined";
import ReplayOutlinedIcon from "@mui/icons-material/ReplayOutlined";
import SecurityOutlinedIcon from "@mui/icons-material/SecurityOutlined";
import XIcon from "@mui/icons-material/X";
import Link from "next/link";
import { Container } from "@/components/container";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { useStoreCategories } from "@/hooks/useStoreCategories";
import { buildFooterShop, FOOTER_HELP } from "@/lib/constants/navigation";

const SOCIAL_ICONS: Record<string, typeof InstagramIcon> = {
  Instagram: InstagramIcon,
  Facebook: FacebookOutlinedIcon,
  X: XIcon,
};

const trustItemDefs = [
  {
    icon: LocalShippingOutlinedIcon,
    title: "Free delivery",
    dynamicFreeDelivery: true as const,
  },
  {
    icon: ReplayOutlinedIcon,
    title: "Easy returns",
    text: "7-day return policy",
  },
  {
    icon: SecurityOutlinedIcon,
    title: "Secure checkout",
    text: "Protected payments",
  },
] as const;

const linkClassName =
  "text-sm text-[#61716a] transition-colors hover:text-[var(--eco-primary)]";

function formatPhoneHref(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("880")) return `tel:+${digits}`;
  if (digits.startsWith("0")) return `tel:+88${digits}`;
  return `tel:${phone}`;
}

export function Footer() {
  const settings = useSiteSettings();
  const categories = useStoreCategories();
  const footerShop = buildFooterShop(categories);
  const year = new Date().getFullYear();
  const copyright = settings.copyrightText.replace("{year}", String(year));
  const visibleSocial = settings.socialLinks.filter((item) => item.visible && item.url);

  return (
    <footer className="mt-auto border-t border-[rgba(32,49,45,0.1)] bg-[#fffdf8]">
      <div className="border-b border-[rgba(32,49,45,0.1)] bg-[#f6f3ed]/60">
        <Container className="py-5 md:py-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {trustItemDefs.map((item) => {
              const text =
                "text" in item
                  ? item.text
                  : settings.freeDeliveryEnabled
                    ? `On orders over ৳${settings.freeDeliveryMinimum.toLocaleString("en-BD")}`
                    : settings.shippingAreas?.[0]
                      ? `From ৳${(
                          settings.shippingClasses?.[0]?.fees?.[0] ?? 0
                        ).toLocaleString("en-BD")}`
                      : "Delivery rates at checkout";
              return (
                <div
                  key={item.title}
                  className="flex items-start gap-3 rounded-md border border-[rgba(32,49,45,0.08)] bg-white/70 px-4 py-3"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[var(--eco-primary-soft)] text-[var(--eco-primary)]">
                    <item.icon sx={{ fontSize: 20 }} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[#20312d]">{item.title}</p>
                    <p className="mt-0.5 text-xs text-[#61716a]">{text}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </Container>
      </div>

      <Container className="py-10 md:py-14">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-xl font-bold tracking-[-0.04em] text-[#20312d]"
            >
              {settings.logoUrl ? (
                <img
                  src={settings.logoUrl}
                  alt=""
                  className="h-10 w-10 object-contain"
                />
              ) : null}
              {settings.shopName}
            </Link>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-[#61716a]">
              {settings.shopShortDescription}
            </p>

            {visibleSocial.length > 0 ? (
              <div className="mt-5 flex items-center gap-2">
                {visibleSocial.map((social) => {
                  const Icon = SOCIAL_ICONS[social.platform] ?? InstagramIcon;
                  return (
                    <a
                      key={`${social.platform}-${social.url}`}
                      href={social.url}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={social.platform}
                      className="flex h-10 w-10 items-center justify-center rounded-md border border-[rgba(32,49,45,0.12)] text-[#20312d] transition-colors hover:border-[var(--eco-primary)] hover:bg-[var(--eco-primary)] hover:text-white"
                    >
                      <Icon sx={{ fontSize: 18 }} />
                    </a>
                  );
                })}
              </div>
            ) : null}
          </div>

          <div className="lg:col-span-2">
            <h3 className="text-sm font-bold tracking-[0.08em] text-[#20312d] uppercase">
              Shop
            </h3>
            <ul className="mt-4 space-y-2.5">
              {footerShop.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className={linkClassName}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-2">
            <h3 className="text-sm font-bold tracking-[0.08em] text-[#20312d] uppercase">
              Help
            </h3>
            <ul className="mt-4 space-y-2.5">
              {FOOTER_HELP.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className={linkClassName}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-4">
            <h3 className="text-sm font-bold tracking-[0.08em] text-[#20312d] uppercase">
              Contact
            </h3>
            <ul className="mt-4 space-y-3">
              <li className="flex items-start gap-2.5 text-sm text-[#61716a]">
                <LocationOnOutlinedIcon
                  sx={{ fontSize: 18, mt: "2px", color: "var(--eco-primary)" }}
                />
                <span>
                  {settings.contactAddress}
                  {settings.city ? `, ${settings.city}` : ""}
                </span>
              </li>
              <li>
                <a
                  href={`mailto:${settings.contactEmail}`}
                  className="flex items-center gap-2.5 text-sm text-[#61716a] transition-colors hover:text-[var(--eco-primary)]"
                >
                  <EmailOutlinedIcon sx={{ fontSize: 18, color: "var(--eco-primary)" }} />
                  {settings.contactEmail}
                </a>
              </li>
              <li>
                <a
                  href={formatPhoneHref(settings.contactPhone)}
                  className="flex items-center gap-2.5 text-sm text-[#61716a] transition-colors hover:text-[var(--eco-primary)]"
                >
                  <PhoneOutlinedIcon sx={{ fontSize: 18, color: "var(--eco-primary)" }} />
                  {settings.contactPhone}
                </a>
              </li>
            </ul>

            {settings.supportNote ? (
              <div className="mt-6 rounded-md border border-[rgba(32,49,45,0.1)] bg-[#f6f3ed]/80 p-4">
                <p className="text-sm font-bold text-[#20312d]">Need help?</p>
                <p className="mt-1 text-xs leading-relaxed text-[#61716a]">
                  {settings.supportNote}
                </p>
                {settings.supportHours ? (
                  <p className="mt-2 text-xs text-[#61716a]">{settings.supportHours}</p>
                ) : null}
                <Link
                  href="/contact"
                  className="mt-3 inline-flex rounded-md bg-[var(--eco-primary)] px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-[var(--eco-primary-dark)]"
                >
                  Contact support
                </Link>
              </div>
            ) : null}
          </div>
        </div>
      </Container>

      <div className="border-t border-[rgba(32,49,45,0.1)]">
        <Container className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-[#61716a]">{copyright}</p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#61716a]">
            <Link href="/about" className="hover:text-[var(--eco-primary)]">
              Privacy
            </Link>
            <Link href="/about" className="hover:text-[var(--eco-primary)]">
              Terms
            </Link>
            {settings.shopTagline ? <span>{settings.shopTagline}</span> : null}
          </div>
        </Container>
      </div>
    </footer>
  );
}
