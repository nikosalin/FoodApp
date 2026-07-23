"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import { NavLinks } from "./NavLinks";

export function MobileMenu() {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button onClick={() => setOpen(!open)} aria-label="Toggle menu">
        {open ? (
          <X className="h-6 w-6 text-pita" />
        ) : (
          <Menu className="h-6 w-6 text-pita" />
        )}
      </button>

      {open && (
        <div className="absolute inset-x-0 top-16 border-t border-olive/30 bg-char px-4 pb-6">
          <nav className="flex flex-col gap-4 pt-4">
            <NavLinks onNavigate={() => setOpen(false)} />
          </nav>
        </div>
      )}
    </div>
  );
}
