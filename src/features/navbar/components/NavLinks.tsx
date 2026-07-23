import Link from "next/link";
import { navLinks } from "../data/nav-links";

interface NavLinksProps {
  onNavigate?: () => void;
  className?: string;
}

export function NavLinks({ onNavigate, className = "" }: NavLinksProps) {
  return (
    <>
      {navLinks.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          onClick={onNavigate}
          className={`text-sm font-medium text-pita/80 transition-colors hover:text-lemon ${className}`}
        >
          {link.label}
        </Link>
      ))}
    </>
  );
}
