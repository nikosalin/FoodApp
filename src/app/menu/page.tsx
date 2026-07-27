import { TopBar } from "@/features/landing/components/TopBar";
import { Navbar } from "@/features/navbar/components/Navbar";
import { Footer } from "@/features/landing/components/Footer";
import { MenuPage } from "@/features/menu/components/MenuPage";

export default function Menu() {
  return (
    <main className="min-h-screen bg-char">
      <TopBar />
      <Navbar />
      <MenuPage />
      <Footer />
    </main>
  );
}
