import { Suspense } from "react";
import { Navbar } from "@/features/navbar/components/Navbar";
import { Footer } from "@/features/landing/components/Footer";
import { MenuPage } from "@/features/menu/components/MenuPage";

export default function Menu() {
  return (
    <main className="min-h-screen bg-char">
      <Navbar />
      <Suspense fallback={null}>
        <MenuPage />
      </Suspense>
      <Footer />
    </main>
  );
}
