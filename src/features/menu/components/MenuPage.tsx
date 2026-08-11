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
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { MenuCategoriesList } from "../data/menu-categories";
import { MenuCategoryNav } from "./MenuCategoryNav";
import { MenuCategorySection } from "./MenuCategorySection";

export function MenuPage() {
  const { t } = useTranslation(["menu", "food"]);
  const menuCategories = useMemo(() => MenuCategoriesList(t), [t]);

  const router = useRouter();
  const searchParams = useSearchParams();

  const requestedId = searchParams.get("category");
  const initialActiveId =
    requestedId &&
    menuCategories.some((category) => category.id === requestedId)
      ? requestedId
      : menuCategories[0].id;
  const [activeId, setActiveId] = useState(initialActiveId);

  useEffect(() => {
    const sections = menuCategories
      .map((category) => document.getElementById(category.id))
      .filter((section): section is HTMLElement => Boolean(section));
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((first, second) => second.intersectionRatio - first.intersectionRatio)[0];
        if (visible) setActiveId(visible.target.id);
      },
      { rootMargin: "-128px 0px -55%", threshold: [0, 0.1, 0.25, 0.5] },
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [menuCategories]);

  useEffect(() => {
    if (!requestedId) return;
    document.getElementById(initialActiveId)?.scrollIntoView();
  }, [initialActiveId, requestedId]);

  const handleSelect = (id: string) => {
    router.replace(`/menu?category=${id}`, { scroll: false });
    setActiveId(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-[#f7f1e8] pb-20">
      <div className="relative overflow-hidden bg-tomato px-4 py-20 text-center text-white">
        <div className="absolute inset-0 opacity-10 [background-image:radial-gradient(circle_at_center,white_1px,transparent_1px)] [background-size:18px_18px]" />
        <p className="relative text-xs font-black uppercase tracking-[0.35em] text-white/75">Fresh from the grill</p>
        <h1 className="relative mt-3 text-5xl font-black uppercase tracking-tight md:text-7xl">
          {t("pageTitle")}
        </h1>
        <span className="relative mx-auto mt-5 block h-1 w-20 rounded-full bg-lemon" />
      </div>

      <MenuCategoryNav
        categories={menuCategories}
        activeId={activeId}
        onSelect={handleSelect}
      />

      <div className="mx-auto max-w-7xl px-4">
        {menuCategories.map((category) => (
          <MenuCategorySection key={category.id} {...category} />
        ))}
      </div>
    </div>
  );
}
