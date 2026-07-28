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
  return (
    <nav className="sticky top-16 z-40 overflow-x-auto border-b border-olive/30 bg-char/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl gap-2 px-4 py-3">
        {categories.map((category) => {
          const isActive = category.id === activeId;
          return (
            <button
              key={category.id}
              onClick={() => onSelect(category.id)}
              className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
                isActive
                  ? "bg-lemon text-char"
                  : "text-pita/70 hover:text-lemon"
              }`}
            >
              {category.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
