import Image from "next/image";
import Link from "next/link";
import { displayImageUrl } from "@/lib/images/display-url";
import type { HeroSideBanner } from "@/types/hero";

type HeroSideCardProps = {
  banner: HeroSideBanner;
};

const toneClassName = {
  forest: "from-[#1f6f5b]/90 via-[#1f6f5b]/55 to-black/20",
  sand: "from-[#8a6a3d]/90 via-[#c49a5a]/45 to-black/15",
} as const;

export function HeroSideCard({ banner }: HeroSideCardProps) {
  return (
    <Link
      href={banner.href}
      className="relative min-h-[150px] flex-1 overflow-hidden rounded-md sm:min-h-[170px]"
    >
      <Image
        src={displayImageUrl(banner.image, 800)}
        alt={banner.imageAlt}
        fill
        sizes="(max-width: 1024px) 100vw, 33vw"
        className="object-cover"
      />
      <div className={`absolute inset-0 bg-gradient-to-r ${toneClassName[banner.tone]}`} />
      <div className="absolute inset-0 flex flex-col justify-end p-4 sm:p-5">
        <h3 className="text-lg font-bold tracking-tight text-white sm:text-xl">
          {banner.title}
        </h3>
        <p className="mt-1 text-sm text-white/90">{banner.subtitle}</p>
      </div>
    </Link>
  );
}
