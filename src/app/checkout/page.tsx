import { Navbar } from "@/features/navbar/components/Navbar";
import { Footer } from "@/features/landing/components/Footer";
import { CheckoutPage } from "@/features/checkout/components/CheckoutPage";

export default function Checkout() {
  return (
    <main className="min-h-screen bg-char">
      <Navbar />
      <CheckoutPage
        stripePublishableKey={
          process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? ""
        }
      />
      <Footer />
    </main>
  );
}
