"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { getCartItemCount } from "../lib/selectors";
import { useCartStore } from "../store/useCartStore";

export function BottomCartDock() {
  const count = useCartStore((state) => getCartItemCount(state.items));

  if (count === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center bg-gradient-to-t from-[#f7f1e8] via-[#f7f1e8]/95 to-transparent px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-6 md:hidden">
      <Link
        href="/cart"
        aria-label={`Warenkorb öffnen, ${count} Artikel`}
        className="pointer-events-auto flex h-14 min-w-28 items-center justify-center gap-3 rounded-full bg-tomato px-7 text-white shadow-[0_12px_35px_rgba(210,65,48,0.4)] transition active:scale-95"
      >
        <ShoppingBag aria-hidden="true" className="size-5" />
        <span className="min-w-6 text-center text-lg font-black tabular-nums">
          {count}
        </span>
      </Link>
    </div>
  );
}
