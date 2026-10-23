import Image from "next/image";
import Link from "next/link";
import { displayImageUrl } from "@/lib/images/display-url";
import type { Category } from "@/types/category";

type TopCategoriesProps = {
  categories: Category[];
};

export function TopCategories({ categories }: TopCategoriesProps) {
  return (
    <section className="w-full">
      <div className="relative mb-6 flex items-center justify-between gap-4 border-b border-[#20312d]">
        <div
          className="-mb-px bg-[#20312d] py-2.5 pr-7 pl-4 text-sm font-bold tracking-wide text-white [clip-path:polygon(0_0,calc(100%-14px)_0,100%_100%,0_100%)] sm:pl-5 sm:text-base"
        >
          Top Categories
        </div>

        <Link
          href="/shop"
          className="shrink-0 pb-2 text-sm font-semibold text-[#1f6f5b] transition-colors hover:text-[#185a4a]"
        >
          See all categories
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-10">
        {categories.map((category) => (
          <Link
            key={category.id}
            href={`/shop/${category.slug}`}
            className="group flex flex-col items-center gap-2.5 rounded-md p-2 text-center transition-colors hover:bg-[rgba(31,111,91,0.06)]"
          >
            <div className="relative h-16 w-16 overflow-hidden rounded-md border border-[rgba(32,49,45,0.1)] bg-white sm:h-[72px] sm:w-[72px]">
              <Image
                src={displayImageUrl(category.image, 160)}
                alt={category.title}
                fill
                sizes="72px"
                className="object-cover transition-transform duration-300 group-hover:scale-105"
              />
            </div>
            <span className="text-sm font-bold text-[#20312d]">{category.title}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
