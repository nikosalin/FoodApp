"use client";

import { useTranslation } from "react-i18next";
import { MenuCategories } from "../data/categories";
import { CategoryCard } from "./CategoryCard";
import i18n from "@/lib/i18n";

export function CategoryGrid() {
  const { t } = useTranslation(["food", "home"]);

  const menuCategories = MenuCategories(t);

  console.log(i18n.language);
  console.log(i18n.hasResourceBundle(i18n.language, "food"));
  console.log(t("gyros.description"));
  return (
    <section className="mx-auto max-w-6xl px-4 py-16">
      <h2 className="mb-10 text-center text-3xl font-black tracking-wide text-pita">
        {t("home:header.title")}
      </h2>
      <div className="grid grid-cols-2 gap-6 sm:grid-cols-3">
        {menuCategories.map((category) => (
          <CategoryCard key={category.id} {...category} />
        ))}
      </div>
    </section>
  );
}
