import { CategoryGrid } from "@/features/landing/components/CategoryGrid";
import { FeaturedItemsList } from "@/features/landing/components/FeaturedItemList";
import { Footer } from "@/features/landing/components/Footer";
import { AppQrCode } from "@/features/landing/components/AppQrCode";
import { TopBar } from "@/features/landing/components/TopBar";
import { Navbar } from "@/features/navbar/components/Navbar";

export default function Home() {
  return (
    <main className="min-h-screen bg-char">
      <TopBar />
      <Navbar />
      <CategoryGrid />
      <FeaturedItemsList />
      <AppQrCode />
      {/* <LocationInfo /> */}
      <Footer />
    </main>
  );
}
