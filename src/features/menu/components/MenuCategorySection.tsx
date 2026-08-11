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

export function MenuCategorySection({ label, items }: MenuCategoryView) {
  return (
    <section className="py-10">
      <h3 className="mb-6 text-3xl font-black uppercase tracking-tight text-char">
        {label}
      </h3>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <MenuItemRow key={item.id} {...item} />
        ))}
      </div>
    </section>
  );
}
