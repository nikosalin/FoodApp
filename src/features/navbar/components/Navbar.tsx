import { Logo } from "./Logo";
// import { NavLinks } from "./NavLinks";
import { MobileMenu } from "./MobileMenu";
import { LanguageSwitcher } from "@/components/languageSwitcher";
import { CartBadge } from "@/features/cart/components/CartBadge";

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-olive/30 bg-char/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Logo />

        <nav className="hidden items-center gap-8 md:flex">
          {/* <NavLinks /> */}
          <p className="text-white bold text-2xl">Το φαγητό θέλει μεράκι</p>
        </nav>

        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <CartBadge />
          <div className="md:hidden">
            <MobileMenu />
          </div>
        </div>
      </div>
    </header>
  );
}
