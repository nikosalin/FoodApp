import type { MenuItemView } from "../types";
import { AddToCartButton } from "@/features/cart/components/AddToCartButton";

export function MenuItemRow({ id, name, description, price }: MenuItemView) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-olive/20 py-4">
      <div>
        <h4 className="font-bold text-pita">{name}</h4>
        <p className="mt-1 text-sm text-pita/70">{description}</p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-2">
        <span className="font-bold text-lemon">€ {price.toFixed(2)}</span>
        <AddToCartButton id={id} name={name} price={price} />
      </div>
    </div>
  );
}
