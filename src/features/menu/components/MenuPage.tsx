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

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { MenuCategoriesList } from "../data/menu-categories";
import { MenuCategoryNav } from "./MenuCategoryNav";
import { MenuCategorySection } from "./MenuCategorySection";
import { BottomCartDock } from "@/features/cart/components/BottomCartDock";

export function MenuPage() {
  const { t } = useTranslation(["menu", "food"]);
  const menuCategories = useMemo(() => MenuCategoriesList(t), [t]);

  const [activeId, setActiveId] = useState(menuCategories[0].id);
  const scrollTargetRef = useRef<string | undefined>(undefined);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  useEffect(() => {
    const sections = menuCategories
      .map((category) => document.getElementById(category.id))
      .filter((section): section is HTMLElement => Boolean(section));
    let frame = 0;

    const updateActiveCategory = () => {
      frame = 0;
      if (scrollTargetRef.current) return;

      const activationLine = 145;
      let current: string | undefined = sections[0]?.id;
      for (const section of sections) {
        if (section.getBoundingClientRect().top <= activationLine) {
          current = section.id;
        } else {
          break;
        }
      }
      if (
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 2
      ) {
        current = sections.at(-1)?.id;
      }
      if (current) {
        setActiveId((previous) => (previous === current ? previous : current));
      }
    };
    const scheduleUpdate = () => {
      if (!frame) frame = window.requestAnimationFrame(updateActiveCategory);
    };
    const finishProgrammaticScroll = () => {
      scrollTargetRef.current = undefined;
      scheduleUpdate();
    };

    updateActiveCategory();
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);
    window.addEventListener("scrollend", finishProgrammaticScroll);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
      window.removeEventListener("scrollend", finishProgrammaticScroll);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    };
  }, [menuCategories]);

  const handleSelect = (id: string) => {
    scrollTargetRef.current = id;
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    setActiveId(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    scrollTimeoutRef.current = setTimeout(() => {
      scrollTargetRef.current = undefined;
    }, 1_500);
  };

  return (
    <div className="min-h-screen bg-[#f5f9fc] pb-28 md:pb-20">
      <div className="relative overflow-hidden bg-[#e9f6fc] px-4 py-16 text-center text-char md:py-20">
        <div className="absolute inset-0 opacity-50 [background-image:radial-gradient(circle_at_center,#9edcf3_1px,transparent_1px)] [background-size:18px_18px]" />
        <div className="absolute -top-28 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-white/70 blur-3xl" />
        <p className="relative text-xs font-black uppercase tracking-[0.35em] text-primary/70">Fresh from the grill</p>
        <h1 className="relative mt-3 text-5xl font-black uppercase tracking-tight md:text-7xl">
          {t("pageTitle")}
        </h1>
        <span className="relative mx-auto mt-5 block h-1 w-20 rounded-full bg-primary" />
      </div>

      <MenuCategoryNav
        categories={menuCategories}
        activeId={activeId}
        onSelect={handleSelect}
      />

      <div className="mx-auto max-w-7xl md:px-4">
        {menuCategories.map((category) => (
          <MenuCategorySection key={category.id} {...category} />
        ))}
      </div>

      <BottomCartDock />
    </div>
  );
}
