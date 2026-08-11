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
import { ChevronLeft, ChevronRight } from "lucide-react";

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
  const activeIndex = categories.findIndex(
    (category) => category.id === activeId,
  );

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
      className="sticky top-16 z-40 border-b border-char/10 bg-[#f7f1e8]/95 shadow-sm backdrop-blur"
    >
      <button
        type="button"
        aria-label="Previous menu category"
        disabled={activeIndex <= 0}
        onClick={() => onSelect(categories[activeIndex - 1].id)}
        className="absolute left-1 top-1/2 z-10 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-white text-char shadow-md transition disabled:opacity-30 md:hidden"
      >
        <ChevronLeft aria-hidden="true" className="size-5" />
      </button>

      <div
        ref={carouselRef}
        className="snap-x snap-mandatory overflow-x-auto scroll-smooth px-12 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:px-0"
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
                    ? "bg-tomato text-white shadow-md"
                    : "bg-white text-char/65 hover:text-tomato"
                }`}
              >
                {category.label}
              </button>
            );
          })}
        </div>
      </div>

      <button
        type="button"
        aria-label="Next menu category"
        disabled={activeIndex < 0 || activeIndex >= categories.length - 1}
        onClick={() => onSelect(categories[activeIndex + 1].id)}
        className="absolute right-1 top-1/2 z-10 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-white text-char shadow-md transition disabled:opacity-30 md:hidden"
      >
        <ChevronRight aria-hidden="true" className="size-5" />
      </button>
    </nav>
  );
}
