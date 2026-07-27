import type { TFunction } from "i18next";
import type { FeaturedItem } from "../types";

export const FeaturedItems = (t: TFunction): FeaturedItem[] => [
  {
    id: "epic-gyros",
    eyebrow: t("epic-gyros.eyebrow"),
    name: t("epic-gyros.name"),
    price: 4.5,
    href: "/order",
  },
  {
    id: "club-souvlaki",
    eyebrow: t("club-souvlaki.eyebrow"),
    name: t("club-souvlaki.name"),
    price: 6.9,
    href: "/order",
  },
  {
    id: "chicken-pita",
    eyebrow: t("chicken-pita.eyebrow"),
    name: t("chicken-pita.name"),
    price: 3.8,
    href: "/order",
  },
  {
    id: "gentle-giant",
    eyebrow: t("gentle-giant.eyebrow"),
    name: t("gentle-giant.name"),
    price: 7.2,
    href: "/order",
  },
];
