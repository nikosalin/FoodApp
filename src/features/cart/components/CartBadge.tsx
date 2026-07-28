"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { useCartStore } from "../store/useCartStore";
import { getCartItemCount } from "../lib/selectors";

export function CartBadge() {
  const items = useCartStore((state) => state.items);
  const count = getCartItemCount(items);

  return (
    <Link
      href="/cart"
      className="relative flex items-center"
      aria-label="View cart"
    >
      <ShoppingBag className="h-5 w-5 text-pita" />
      {count > 0 && (
        <span className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-tomato text-[10px] font-bold text-pita">
          {count}
        </span>
      )}
    </Link>
  );
}
