// import type { TFunction } from "i18next";
// import type { MenuCategory } from "../types";

// export const MenuCategories = (t: TFunction): MenuCategory[] => [
//   {
//     id: "gyros",
//     title: t("gyros.title"),
//     description: t("gyros.description"),
//     imageAlt: t("gyros.imageAlt"),
//     href: "/menu?category=gyros",
//   },
//   {
//     id: "souvlaki",
//     title: t("souvlaki.title"),
//     description: t("souvlaki.description"),
//     imageAlt: t("souvlaki.imageAlt"),
//     href: "/menu?category=souvlaki",
//   },
//   {
//     id: "pites",
//     title: t("pites.title"),
//     description: t("pites.description"),
//     imageAlt: t("pites.imageAlt"),
//     href: "/menu?category=pites",
//   },
//   {
//     id: "merides",
//     title: t("merides.title"),
//     description: t("merides.description"),
//     imageAlt: t("merides.imageAlt"),
//     href: "/menu?category=merides",
//   },
//   {
//     id: "salates",
//     title: t("salates.title"),
//     description: t("salates.description"),
//     imageAlt: t("salates.imageAlt"),
//     href: "/menu?category=salates",
//   },
//   {
//     id: "patates",
//     title: t("patates.title"),
//     description: t("patates.description"),
//     imageAlt: t("patates.imageAlt"),
//     href: "/menu?category=patates",
//   },
// ];
import type { TFunction } from "i18next";
import type { MenuCategory } from "../types";

export const MenuCategories = (t: TFunction): MenuCategory[] => [
  {
    id: "gyrosPita",
    title: t("gyrosPita.title"),
    description: t("gyrosPita.description"),
    imageAlt: t("gyrosPita.imageAlt"),
    href: "/menu?category=gyrosPita",
  },
  {
    id: "grill",
    title: t("grill.title"),
    description: t("grill.description"),
    imageAlt: t("grill.imageAlt"),
    href: "/menu?category=grill",
  },
  {
    id: "salads",
    title: t("salads.title"),
    description: t("salads.description"),
    imageAlt: t("salads.imageAlt"),
    href: "/menu?category=salads",
  },
  {
    id: "sides",
    title: t("sides.title"),
    description: t("sides.description"),
    imageAlt: t("sides.imageAlt"),
    href: "/menu?category=sides",
  },
  {
    id: "drinksNonAlcoholic",
    title: t("drinksNonAlcoholic.title"),
    description: t("drinksNonAlcoholic.description"),
    imageAlt: t("drinksNonAlcoholic.imageAlt"),
    href: "/menu?category=drinksNonAlcoholic",
  },
  {
    id: "drinksAlcoholic",
    title: t("drinksAlcoholic.title"),
    description: t("drinksAlcoholic.description"),
    imageAlt: t("drinksAlcoholic.imageAlt"),
    href: "/menu?category=drinksAlcoholic",
  },
];
