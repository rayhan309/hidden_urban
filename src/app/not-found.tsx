import type { Metadata } from "next";
import { CartSidebar } from "@/components/cart/CartSidebar";
import { NotFoundView } from "@/components/errors";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { WishlistSidebar } from "@/components/wishlist/WishlistSidebar";

export const metadata: Metadata = {
  title: "Page not found",
  description:
    "This page could not be found. Return home or continue shopping at Hidden Urban.",
  robots: {
    index: false,
    follow: true,
  },
};

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col">
      <Header />
      <main className="flex flex-1 flex-col">
        <NotFoundView />
      </main>
      <Footer />
      <CartSidebar />
      <WishlistSidebar />
    </div>
  );
}
