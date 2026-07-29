import { CategoryGrid } from "@/features/landing/components/CategoryGrid";
import { FeaturedItemsList } from "@/features/landing/components/FeaturedItemList";
import { Footer } from "@/features/landing/components/Footer";
import { AppQrCode } from "@/features/landing/components/AppQrCode";
import { TopBar } from "@/features/landing/components/TopBar";
import { Navbar } from "@/features/navbar/components/Navbar";
import { Hero } from "@/features/landing/components/Hero";
import { LocationInfo } from "@/features/landing/components/LocationInfo";

export default function Home() {
  return (
    <main className="min-h-screen bg-char">
      <TopBar />
      <Navbar />
      <Hero />
      <CategoryGrid />
      <FeaturedItemsList />
      <AppQrCode />
      <LocationInfo />
      <Footer />
    </main>
  );
}
