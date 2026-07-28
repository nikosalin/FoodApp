// "use client";

// import { useTranslation } from "react-i18next";
// import { MenuCategoriesList } from "../data/menu-categories";
// import { MenuCategoryNav } from "./MenuCategoryNav";
// import { MenuCategorySection } from "./MenuCategorySection";

// export function MenuPage() {
//   const { t } = useTranslation(["menu", "food"]);
//   const menuCategories = MenuCategoriesList(t);

//   return (
//     <div>
//       <div className="mx-auto max-w-6xl px-4 pt-16 pb-8 text-center">
//         <h1 className="text-4xl font-black tracking-wide text-pita">
//           {t("pageTitle")}
//         </h1>
//       </div>

//       <MenuCategoryNav categories={menuCategories} />

//       <div className="mx-auto max-w-6xl px-4">
//         {menuCategories.map((category) => (
//           <MenuCategorySection key={category.id} {...category} />
//         ))}
//       </div>
//     </div>
//   );
// }
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { getPublicMenu } from "../data/menu";
import { MenuCategoryNav } from "./MenuCategoryNav";
import { MenuCategorySection } from "./MenuCategorySection";
import type { MenuCategoryView } from "../types";

const defaultRestaurantId = "restaurant-1";
const defaultRestaurantSlug = "the-greeks-mitte";

export function MenuPage() {
  const { t } = useTranslation("menu");
  const menuCategories = canonicalMenuCategories();

  const router = useRouter();
  const searchParams = useSearchParams();

  const requestedId = searchParams.get("category");
  const activeId =
    requestedId &&
    menuCategories.some((category) => category.id === requestedId)
      ? requestedId
      : menuCategories[0].id;

  const handleSelect = (id: string) => {
    router.replace(`/menu?category=${id}`, { scroll: false });
  };

  const activeCategory = menuCategories.find(
    (category) => category.id === activeId,
  );

  return (
    <div>
      <div className="mx-auto max-w-6xl px-4 pt-16 pb-8 text-center">
        <h1 className="text-4xl font-black tracking-wide text-pita">
          {t("pageTitle")}
        </h1>
      </div>

      <MenuCategoryNav
        categories={menuCategories}
        activeId={activeId}
        onSelect={handleSelect}
      />

      <div className="mx-auto max-w-6xl px-4">
        {activeCategory && <MenuCategorySection {...activeCategory} />}
      </div>
    </div>
  );
}

function canonicalMenuCategories(): MenuCategoryView[] {
  const items = getPublicMenu(defaultRestaurantSlug);
  return [...new Set(items.map((item) => item.category))].map((category) => ({
    id: category.toLowerCase().replaceAll("ä", "a").replaceAll(" ", "-"),
    label: category,
    items: items
      .filter((item) => item.category === category)
      .map((item) => ({ ...item, restaurantId: defaultRestaurantId })),
  }));
}
