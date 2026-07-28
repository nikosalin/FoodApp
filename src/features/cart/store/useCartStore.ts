import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartState } from "../types";

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      restaurantId: null,

      addItem: (item, restaurantId) =>
        set((state) => {
          if (state.restaurantId && state.restaurantId !== restaurantId) {
            return {
              restaurantId,
              items: [{ ...item, quantity: 1 }],
            };
          }
          const existing = state.items.find((i) => i.id === item.id);
          if (existing) {
            return {
              restaurantId,
              items: state.items.map((i) =>
                i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i,
              ),
            };
          }
          return {
            restaurantId,
            items: [...state.items, { ...item, quantity: 1 }],
          };
        }),

      removeItem: (id) =>
        set((state) => {
          const items = state.items.filter((i) => i.id !== id);
          return { items, restaurantId: items.length ? state.restaurantId : null };
        }),

      updateQuantity: (id, quantity) =>
        set((state) => {
          const items =
            quantity <= 0
              ? state.items.filter((i) => i.id !== id)
              : state.items.map((i) => (i.id === id ? { ...i, quantity } : i));
          return { items, restaurantId: items.length ? state.restaurantId : null };
        }),

      clearCart: () => set({ items: [], restaurantId: null }),
    }),
    { name: "opa-cart", version: 2 },
  ),
);
