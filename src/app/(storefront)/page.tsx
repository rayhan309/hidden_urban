import { HomePageContent } from "@/components/home/HomePageContent";
import { loadHomePageData } from "@/lib/data/home";

export default async function HomePage() {
  const data = await loadHomePageData();
  return <HomePageContent data={data} />;
}
