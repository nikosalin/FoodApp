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
  addressLines: string[];
}

export type DayKey =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export interface DaySchedule {
  dayKey: DayKey;
  open: string | null;
  close: string | null;
}
