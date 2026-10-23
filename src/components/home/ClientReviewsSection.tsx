"use client";

import Image from "next/image";
import { useState } from "react";
import type { Swiper as SwiperType } from "swiper";
import { Autoplay } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";
import { StarRating } from "@/components/ui/StarIcon";
import type { ClientReview } from "@/types/review";
import "swiper/css";

type ClientReviewsSectionProps = {
  reviews: ClientReview[];
};

const COMMENT_PREVIEW_LENGTH = 110;

function Stars({ rating }: { rating: number }) {
  return <StarRating rating={rating} />;
}

function ReviewCard({ review }: { review: ClientReview }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = review.comment.length > COMMENT_PREVIEW_LENGTH;
  const displayComment =
    !isLong || expanded
      ? review.comment
      : `${review.comment.slice(0, COMMENT_PREVIEW_LENGTH).trimEnd()}...`;

  return (
    <article className="flex flex-col rounded-md border border-[rgba(32,49,45,0.1)] bg-white p-5 sm:p-6">
      <Stars rating={review.rating} />

      <div className="mt-3">
        <p className="text-sm leading-relaxed text-[#20312d] sm:text-[15px]">
          &ldquo;{displayComment}&rdquo;
          {isLong ? (
            <>
              {" "}
              <button
                type="button"
                onClick={() => setExpanded((value) => !value)}
                className="inline font-semibold text-[#1f6f5b] transition-colors hover:text-[#185a4a]"
              >
                {expanded ? "Show less" : "Show more"}
              </button>
            </>
          ) : null}
        </p>
      </div>

      <div className="mt-3 flex items-center gap-3 border-t border-[rgba(32,49,45,0.08)] pt-3">
        <div className="relative h-11 w-11 overflow-hidden rounded-md bg-[#f0ebe3]">
          <Image
            src={review.avatar}
            alt={review.name}
            fill
            sizes="44px"
            className="object-cover"
          />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-[#20312d]">{review.name}</p>
          <p className="truncate text-xs text-[#61716a]">
            {review.role} · {review.location}
          </p>
          <p className="mt-0.5 truncate text-xs font-medium text-[#1f6f5b]">
            Bought: {review.productTitle}
          </p>
        </div>
      </div>
    </article>
  );
}

export function ClientReviewsSection({ reviews }: ClientReviewsSectionProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [swiper, setSwiper] = useState<SwiperType | null>(null);

  if (reviews.length === 0) return null;

  return (
    <section className="w-full">
      <div className="relative mb-6 flex items-center justify-between gap-4 border-b border-[#20312d]">
        <div className="-mb-px bg-[#20312d] py-2.5 pr-7 pl-4 text-sm font-bold tracking-wide text-white [clip-path:polygon(0_0,calc(100%-14px)_0,100%_100%,0_100%)] sm:pl-5 sm:text-base">
          Client Reviews
        </div>
        <p className="hidden pb-2 text-sm text-[#61716a] sm:block">
          What our customers say
        </p>
      </div>

      <div className="relative">
        <Swiper
          modules={[Autoplay]}
          autoplay={{ delay: 4200, disableOnInteraction: false }}
          loop={reviews.length > 3}
          spaceBetween={16}
          slidesPerView={1}
          breakpoints={{
            640: { slidesPerView: 2, spaceBetween: 18 },
            1024: { slidesPerView: 3, spaceBetween: 20 },
          }}
          onSwiper={setSwiper}
          onSlideChange={(instance) => setActiveIndex(instance.realIndex)}
        >
          {reviews.map((review) => (
            <SwiperSlide key={review.id} className="!h-auto">
              <ReviewCard review={review} />
            </SwiperSlide>
          ))}
        </Swiper>

        <div className="mt-5 flex justify-center gap-2">
          {reviews.map((review, index) => (
            <button
              key={review.id}
              type="button"
              aria-label={`Go to review ${index + 1}`}
              onClick={() => swiper?.slideToLoop(index)}
              className={`h-1.5 rounded-md transition-all ${
                activeIndex === index
                  ? "w-8 bg-[#1f6f5b]"
                  : "w-4 bg-[rgba(31,111,91,0.25)] hover:bg-[rgba(31,111,91,0.45)]"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
