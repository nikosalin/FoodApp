import Link from "next/link";
import { UtensilsCrossed } from "lucide-react";
import type { MenuCategory } from "../types";

export function CategoryCard({
  title,
  description,
  imageAlt,
  href,
}: MenuCategory) {
  return (
    <Link
      href={href}
      className="group flex h-full min-h-[220px] flex-col items-center rounded-lg bg-pita/5 p-6 text-center transition-colors hover:bg-pita/10"
    >
      <div
        className="mb-4 flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-tomato/20 text-tomato transition-transform group-hover:scale-105"
        role="img"
        aria-label={imageAlt}
      >
        <UtensilsCrossed className="h-8 w-8" />
      </div>
      <h3 className="line-clamp-2 min-h-[2.5rem] font-bold tracking-wide text-lemon">
        {title}
      </h3>
      <p className="mt-1 text-sm text-pita/70 line-clamp-3">{description}</p>
    </Link>
  );
}
