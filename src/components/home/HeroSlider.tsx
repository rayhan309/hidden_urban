"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import type { Swiper as SwiperType } from "swiper";
import { Autoplay } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";
import { displayImageUrl } from "@/lib/images/display-url";
import type { HeroSlide } from "@/types/hero";
import "swiper/css";

type HeroSliderProps = {
  slides: HeroSlide[];
};

export function HeroSlider({ slides }: HeroSliderProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [swiper, setSwiper] = useState<SwiperType | null>(null);

  if (slides.length === 0) return null;

  const canLoop = slides.length > 1;

  return (
    <div className="relative h-full min-h-[260px] overflow-hidden rounded-md sm:min-h-[320px] lg:min-h-0">
      <Swiper
        modules={[Autoplay]}
        autoplay={canLoop ? { delay: 4500, disableOnInteraction: false } : false}
        loop={canLoop}
        onSwiper={setSwiper}
        onSlideChange={(instance) => setActiveIndex(instance.realIndex)}
        className="h-full"
      >
        {slides.map((slide) => (
          <SwiperSlide key={slide.id} className="!h-full">
            <Link href={slide.href} className="relative block h-full min-h-[260px] sm:min-h-[320px] lg:min-h-full">
              <Image
                src={displayImageUrl(slide.image, 1400)}
                alt={slide.imageAlt}
                fill
                priority={slide.id === slides[0]?.id}
                sizes="(max-width: 1024px) 100vw, 66vw"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/35 to-transparent" />
              <div className="absolute inset-0 flex flex-col justify-end p-5 sm:p-8 lg:p-10">
                <p className="mb-2 text-xs font-semibold tracking-[0.18em] text-white/80 uppercase">
                  Hidden Urban
                </p>
                <h2 className="max-w-xl text-2xl font-bold tracking-tight text-white sm:text-3xl lg:text-4xl">
                  {slide.title}
                </h2>
                <p className="mt-2 max-w-md text-sm text-white/85 sm:text-base">
                  {slide.subtitle}
                </p>
                <span className="mt-4 inline-flex w-fit items-center rounded-md bg-white px-4 py-2 text-sm font-semibold text-[#20312d]">
                  {slide.ctaLabel}
                </span>
              </div>
            </Link>
          </SwiperSlide>
        ))}
      </Swiper>

      {canLoop ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-4 z-10 flex justify-center gap-2 sm:bottom-5">
          {slides.map((slide, index) => (
            <button
              key={slide.id}
              type="button"
              aria-label={`Go to slide ${index + 1}`}
              onClick={() => swiper?.slideToLoop(index)}
              className={`pointer-events-auto h-1.5 rounded-md transition-all ${
                activeIndex === index
                  ? "w-8 bg-white"
                  : "w-4 bg-white/45 hover:bg-white/70"
              }`}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
