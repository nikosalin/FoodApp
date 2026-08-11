import type { CartItem } from "../types";

export function getCartItemCount(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}

export function getCartTotal(items: CartItem[]): number {
  return items.reduce(
    (sum, item) =>
      sum +
      (item.price +
        (item.selectedExtras ?? []).reduce(
          (extrasTotal, extra) => extrasTotal + extra.price,
          0,
        )) *
        item.quantity,
    0,
  );
}
