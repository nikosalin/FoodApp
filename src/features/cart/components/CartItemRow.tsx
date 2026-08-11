"use client";

import { Minus, Plus, Trash2 } from "lucide-react";
import { useCartStore } from "../store/useCartStore";
import type { CartItem } from "../types";

export function CartItemRow({ id, name, price, quantity, excludedIngredients }: CartItem) {
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);

  return (
    <div className="flex items-center justify-between gap-4 border-b border-olive/20 py-4">
      <div>
        <h4 className="font-bold text-pita">{name}</h4>
        {excludedIngredients.length > 0 && (
          <p className="mt-1 text-xs text-tomato">
            Without {excludedIngredients.join(", ")}
          </p>
        )}
        <span className="text-sm text-pita/70">€ {price.toFixed(2)} each</span>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => updateQuantity(id, quantity - 1)}
          className="flex h-7 w-7 items-center justify-center rounded-full bg-pita/10 text-pita hover:bg-pita/20"
          aria-label={`Decrease ${name} quantity`}
        >
          <Minus className="h-3.5 w-3.5" />
        </button>

        <span className="w-6 text-center font-semibold text-pita">
          {quantity}
        </span>

        <button
          onClick={() => updateQuantity(id, quantity + 1)}
          className="flex h-7 w-7 items-center justify-center rounded-full bg-pita/10 text-pita hover:bg-pita/20"
          aria-label={`Increase ${name} quantity`}
        >
          <Plus className="h-3.5 w-3.5" />
        </button>

        <span className="w-16 text-right font-bold text-lemon">
          € {(price * quantity).toFixed(2)}
        </span>

        <button
          onClick={() => removeItem(id)}
          className="text-tomato hover:text-tomato/70"
          aria-label={`Remove ${name} from cart`}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
