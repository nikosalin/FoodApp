// import type { MenuCategoryView } from "../types";
// import { MenuItemRow } from "./MenuItemRow";

// export function MenuCategorySection({ id, label, items }: MenuCategoryView) {
//   return (
//     <section id={id} className="scroll-mt-28 py-10">
//       <h3 className="mb-2 text-2xl font-black tracking-wide text-pita">
//         {label}
//       </h3>
//       <div>
//         {items.map((item) => (
//           <MenuItemRow key={item.id} {...item} />
//         ))}
//       </div>
//     </section>
//   );
// }
import type { MenuCategoryView } from "../types";
import { MenuItemRow } from "./MenuItemRow";

export function MenuCategorySection({ id, label, items }: MenuCategoryView) {
  const isPopular = id === "popular";

  return (
    <section id={id} className="scroll-mt-32 py-6 md:py-10">
      <h3 className="mb-3 px-4 text-2xl font-black uppercase tracking-tight text-char md:mb-6 md:px-0 md:text-3xl">
        {label}
      </h3>
      <div
        className={
          isPopular
            ? "flex touch-pan-x snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:grid md:grid-cols-2 md:gap-5 md:overflow-visible xl:grid-cols-3"
            : "overflow-hidden border-y border-char/10 md:grid md:grid-cols-2 md:gap-5 md:overflow-visible md:border-0 xl:grid-cols-3"
        }
      >
        {items.map((item) => (
          <div
            key={item.id}
            className={
              isPopular
                ? "w-[85vw] shrink-0 snap-center first:ml-4 last:mr-4 md:w-auto md:first:ml-0 md:last:mr-0 md:[&>article]:h-full"
                : "contents"
            }
          >
            <MenuItemRow {...item} />
          </div>
        ))}
      </div>
    </section>
  );
}
