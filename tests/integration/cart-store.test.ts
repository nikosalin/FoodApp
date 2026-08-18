import { beforeEach, describe, expect, it } from "vitest";
import { useCartStore } from "@/features/cart/store/useCartStore";
import type { CartItem } from "@/features/cart/types";

const baseItem: Omit<CartItem, "quantity"> = {
  id: "line-1",
  menuItemId: "fries",
  name: "Fries",
  price: 4,
  excludedIngredients: [],
};

describe("cart store", () => {
  beforeEach(() => {
    useCartStore.getState().clearCart();
  });

  it("merges the same item configuration into one line", () => {
    useCartStore.getState().addItem(baseItem, "restaurant-1");
    useCartStore
      .getState()
      .addItem({ ...baseItem, id: "line-2" }, "restaurant-1");

    const { items, restaurantId } = useCartStore.getState();

    expect(restaurantId).toBe("restaurant-1");
    expect(items).toHaveLength(1);
    expect(items[0].quantity).toBe(2);
  });

  it("keeps customized items separate", () => {
    useCartStore.getState().addItem(
      {
        ...baseItem,
        selectedExtras: [{ menuItemId: "ketchup", name: "Ketchup", price: 1 }],
      },
      "restaurant-1",
    );

    useCartStore.getState().addItem(baseItem, "restaurant-1");

    expect(useCartStore.getState().items).toHaveLength(2);
  });

  it("clears restaurantId when the cart becomes empty", () => {
    useCartStore.getState().addItem(baseItem, "restaurant-1");
    useCartStore.getState().clearCart();

    expect(useCartStore.getState().restaurantId).toBeNull();
    expect(useCartStore.getState().items).toHaveLength(0);
  });
});
