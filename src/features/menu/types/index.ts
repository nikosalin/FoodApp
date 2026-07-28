export interface MenuItemDefinition {
  id: string;
  price: number;
}

export interface MenuCategoryDefinition {
  id: string;
  items: MenuItemDefinition[];
}

export interface MenuItemView {
  id: string;
  name: string;
  description: string;
  price: number;
  restaurantId?: string;
}

export interface MenuCategoryView {
  id: string;
  label: string;
  items: MenuItemView[];
  quantity?: number;
}
