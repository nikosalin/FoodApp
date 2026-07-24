"use client";

import { useTranslation } from "react-i18next";
import { FeaturedItems } from "../data/featured-items";
import { FeaturedItemCard } from "./FeaturedItemCard";

export function FeaturedItemsList() {
  const { t } = useTranslation("food");

  const featuredItems = FeaturedItems(t);

  return (
    <section className="mx-auto max-w-6xl px-4 py-16">
      <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
        {featuredItems.map((item) => (
          <FeaturedItemCard key={item.id} {...item} />
        ))}
      </div>
    </section>
  );
}
