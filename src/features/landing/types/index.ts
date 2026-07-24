import { TFunction } from "i18next";

export interface MenuCategory {
  id: string;
  title: string;
  description: string;
  imageAlt: string;
  href: string;
  t?: TFunction;
}

export interface FeaturedItem {
  id: string;
  eyebrow: string;
  name: string;
  price: number;
  href: string;
}

export interface StoreInfo {
  phone: string;
  hours: string;
  addressLines: string[];
}
