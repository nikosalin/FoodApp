import { describe, expect, it } from "vitest";
import { getCartItemCount, getCartTotal } from "@/features/cart/lib/selectors";
import type { CartItem } from "@/features/cart/types";

describe("cart selectors", () => {
  it("calculates item count correctly", () => {
    const items: CartItem[] = [
      {
        id: "1",
        menuItemId: "fries",
        name: "Fries",
        price: 4,
        quantity: 2,
        excludedIngredients: [],
      },
      {
        id: "2",
        menuItemId: "gyros",
        name: "Gyros Plate",
        price: 16.5,
        quantity: 1,
        excludedIngredients: [],
      },
    ];

    expect(getCartItemCount(items)).toBe(3);
  });

  it("calculates total including extras", () => {
    const items: CartItem[] = [
      {
        id: "1",
        menuItemId: "fries",
        name: "Fries",
        price: 4,
        quantity: 2,
        excludedIngredients: [],
      },
      {
        id: "2",
        menuItemId: "gyros",
        name: "Gyros Plate",
        price: 16.5,
        quantity: 1,
        excludedIngredients: [],
        selectedExtras: [{ menuItemId: "ketchup", name: "Ketchup", price: 1 }],
      },
    ];

    expect(getCartTotal(items)).toBe(25.5);
  });
});
