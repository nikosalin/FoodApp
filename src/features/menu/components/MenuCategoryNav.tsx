// import Link from "next/link";
// import type { MenuCategoryView } from "../types";

// interface MenuCategoryNavProps {
//   categories: MenuCategoryView[];
// }

// export function MenuCategoryNav({ categories }: MenuCategoryNavProps) {
//   return (
//     <nav className="sticky top-16 z-40 overflow-x-auto border-b border-olive/30 bg-char/95 backdrop-blur">
//       {" "}
//       <div className="mx-auto flex max-w-6xl gap-6 px-4 py-3">
//         {categories.map((category) => (
//           <Link
//             key={category.id}
//             href={`#${category.id}`}
//             className="whitespace-nowrap text-sm font-semibold text-pita/70 hover:text-lemon"
//           >
//             {category.label}
//           </Link>
//         ))}
//       </div>
//     </nav>
//   );
// }
import { useEffect, useRef } from "react";

interface MenuCategoryNavProps {
  categories: { id: string; label: string }[];
  activeId: string;
  onSelect: (id: string) => void;
}

export function MenuCategoryNav({
  categories,
  activeId,
  onSelect,
}: MenuCategoryNavProps) {
  const carouselRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const carousel = carouselRef.current;
    const activeButton = carousel?.querySelector<HTMLElement>(
      `[data-category-id="${activeId}"]`,
    );
    if (!carousel || !activeButton) return;

    carousel.scrollTo({
      left:
        activeButton.offsetLeft -
        carousel.clientWidth / 2 +
        activeButton.offsetWidth / 2,
      behavior: "smooth",
    });
  }, [activeId]);

  return (
    <nav
      aria-label="Menu categories"
      className="sticky top-16 z-40 border-b border-[#dceaf2] bg-white/95 shadow-[0_4px_18px_rgba(15,23,42,0.04)] backdrop-blur"
    >
      <div
        ref={carouselRef}
        className="touch-pan-x snap-x snap-proximity overflow-x-auto overscroll-x-contain scroll-smooth px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:px-0"
      >
        <div className="mx-auto flex w-max min-w-full max-w-7xl gap-2 py-4 md:w-auto md:px-4">
          {categories.map((category) => {
            const isActive = category.id === activeId;
            return (
              <button
                key={category.id}
                data-category-id={category.id}
                onClick={() => onSelect(category.id)}
                className={`snap-center whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
                  isActive
                    ? "bg-primary text-white shadow-[0_6px_18px_rgba(11,116,209,0.22)]"
                    : "bg-[#eef7fb] text-char/65 hover:text-primary"
                }`}
              >
                {category.label}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
