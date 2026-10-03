import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SiteSettingsShell } from "@/components/site/SiteSettingsShell";
import { TrackingPixels } from "@/components/site/TrackingPixels";
import { AppProviders } from "@/providers/AppProviders";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Hidden Urban | Men's Fashion",
    template: "%s | Hidden Urban",
  },
  description: "Men's fashion ecommerce — thoughtful pieces for everyday style.",
  icons: {
    icon: "/brand/hidden-urban-logo.jpg",
    apple: "/brand/hidden-urban-logo.jpg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <TrackingPixels />
      </head>
      <body className="min-h-full flex flex-col">
        <AppProviders>
          <SiteSettingsShell>{children}</SiteSettingsShell>
        </AppProviders>
      </body>
    </html>
  );
}
