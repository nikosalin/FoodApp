"use client";

import { useTranslation } from "react-i18next";
import { MenuCategoriesList } from "../data/menu-categories";
import { MenuCategoryNav } from "./MenuCategoryNav";
import { MenuCategorySection } from "./MenuCategorySection";

export function MenuPage() {
  const { t } = useTranslation(["menu", "food"]);
  const menuCategories = MenuCategoriesList(t);

  return (
    <div>
      <div className="mx-auto max-w-6xl px-4 pt-16 pb-8 text-center">
        <h1 className="text-4xl font-black tracking-wide text-pita">
          {t("pageTitle")}
        </h1>
      </div>

      <MenuCategoryNav categories={menuCategories} />

      <div className="mx-auto max-w-6xl px-4">
        {menuCategories.map((category) => (
          <MenuCategorySection key={category.id} {...category} />
        ))}
      </div>
    </div>
  );
}
