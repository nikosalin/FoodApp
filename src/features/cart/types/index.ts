export interface CartItem {
  /** Unique cart-line id. Customizations create separate lines. */
  id: string;
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  excludedIngredients: string[];
}

export interface CartState {
  items: CartItem[];
  restaurantId: string | null;
  addItem: (item: Omit<CartItem, "quantity">, restaurantId: string) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
}

export interface AddToCartButtonProps {
  id: string;
  name: string;
  description: string;
  price: number;
  restaurantId: string;
}

export interface CartSummaryProps {
  items: CartItem[];
}
