import Link from "next/link";
import type { FeaturedItem } from "../types";
import { useTranslation } from "react-i18next";

export function FeaturedItemCard({ eyebrow, name, price, href }: FeaturedItem) {
  const { t } = useTranslation("food");
  return (
    <div className="flex h-full min-h-[200px] flex-col items-center rounded-lg border border-olive/30 bg-pita/5 px-6 py-8 text-center">
      <span className="line-clamp-1 text-xs font-semibold tracking-widest text-tomato">
        {eyebrow}
      </span>
      <h3 className="mt-2 line-clamp-2 min-h-[3.5rem] text-xl font-black tracking-wide text-pita">
        {name}
      </h3>
      <p className="mt-4 text-2xl font-black text-lemon">
        € {price.toFixed(2)}
      </p>
      <Link
        href={href}
        className="mt-auto rounded-full bg-tomato px-5 py-2 text-sm font-semibold text-pita transition-colors hover:bg-tomato/90"
      >
        {t("orderButton.label")}
      </Link>
    </div>
  );
}
