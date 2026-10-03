"use client";

import { ClientReviewsSection } from "@/components/home/ClientReviewsSection";
import { CollectionsSection } from "@/components/home/CollectionsSection";
import { HeroSection } from "@/components/home/HeroSection";
import { TopCategories } from "@/components/home/TopCategories";
import { Box, CircularProgress } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { heroFromCollections } from "@/lib/hero/from-collections";
import { queryKeys } from "@/lib/queries/query-keys";
import { fetchHomePageData } from "@/services/store-queries";

export function HomePageContent() {
  const settings = useSiteSettings();
  const { data, isPending, isError } = useQuery({
    queryKey: queryKeys.home.page(),
    queryFn: fetchHomePageData,
  });

  const hero = useMemo(() => {
    const configuredSlides = settings.heroSlides ?? [];
    const configuredSides = settings.heroSideBanners ?? [];
    if (configuredSlides.length > 0 || configuredSides.length > 0) {
      return { slides: configuredSlides, sideBanners: configuredSides };
    }
    return heroFromCollections(data?.collections ?? []);
  }, [settings.heroSlides, settings.heroSideBanners, data?.collections]);

  if (isPending) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 12 }}>
        <CircularProgress size={32} />
      </Box>
    );
  }

  if (isError || !data) {
    return null;
  }

  return (
    <div className="flex flex-1 flex-col gap-10 md:gap-12">
      <HeroSection slides={hero.slides} sideBanners={hero.sideBanners} />
      <TopCategories categories={data.categories} />
      <CollectionsSection products={data.recentProducts ?? []} />
      <ClientReviewsSection reviews={data.reviews} />
    </div>
  );
}
