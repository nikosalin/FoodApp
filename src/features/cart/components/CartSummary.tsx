import { getCartTotal } from "../lib/selectors";
import type { CartSummaryProps } from "../types";

export function CartSummary({ items }: CartSummaryProps) {
  const total = getCartTotal(items);

  return (
    <div className="flex items-center justify-between border-t border-olive/30 pt-4 text-lg">
      <span className="font-bold text-pita">Total</span>
      <span className="font-black text-lemon">€ {total.toFixed(2)}</span>
    </div>
  );
}
