import { getCartTotal } from "../lib/selectors";
import type { CartSummaryProps } from "../types";

export function CartSummary({ items }: CartSummaryProps) {
  const total = getCartTotal(items);

  return (
    <div className="flex items-center justify-between border-t border-border pt-4 text-lg">
      <span className="font-bold text-char">Total</span>
      <span className="font-black text-primary">€ {total.toFixed(2)}</span>
    </div>
  );
}
