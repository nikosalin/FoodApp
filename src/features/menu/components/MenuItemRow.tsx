import type { MenuItemView } from "../types";
import { AddToCartButton } from "@/features/cart/components/AddToCartButton";

export function MenuItemRow({
  id,
  name,
  description,
  price,
  restaurantId = "restaurant-1",
}: MenuItemView) {
  return (
    <article className="group flex min-h-44 flex-col justify-between gap-6 rounded-3xl border border-char/10 bg-white p-6 shadow-[0_18px_50px_rgba(43,36,32,0.08)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(43,36,32,0.14)]">
      <div>
        <span className="mb-4 block h-1 w-12 rounded-full bg-tomato transition-all group-hover:w-20" />
        <h4 className="text-xl font-black uppercase tracking-wide text-char">{name}</h4>
        <p className="mt-2 text-sm leading-6 text-char/65">{description}</p>
      </div>
      <div className="flex items-center justify-between gap-4">
        <span className="text-xl font-black text-tomato">€ {price.toFixed(2)}</span>
        <AddToCartButton
          id={id}
          name={name}
          description={description}
          price={price}
          restaurantId={restaurantId}
        />
      </div>
    </article>
  );
}
