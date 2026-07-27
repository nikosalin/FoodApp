import { Navbar } from "@/features/navbar/components/Navbar";
import { Footer } from "@/features/landing/components/Footer";
import { CartPage } from "@/features/cart/components/CartPage";

export default function Cart() {
  return (
    <main className="min-h-screen bg-char">
      <Navbar />
      <CartPage />
      <Footer />
    </main>
  );
}
