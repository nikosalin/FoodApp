import { CategoryGrid } from "@/features/landing/components/CategoryGrid";
import { FeaturedItemsList } from "@/features/landing/components/FeaturedItemList";
import { TopBar } from "@/features/landing/components/TopBar";
import { Navbar } from "@/features/navbar/components/Navbar";

export default function Home() {
  return (
    <main className="min-h-screen bg-char">
      <TopBar />
      <Navbar />
      <CategoryGrid />
      <FeaturedItemsList />
    </main>
  );
}
