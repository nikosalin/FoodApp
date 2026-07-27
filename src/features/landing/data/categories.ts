import type { TFunction } from "i18next";
import type { MenuCategory } from "../types";

export const MenuCategories = (t: TFunction): MenuCategory[] => [
  {
    id: "gyros",
    title: t("gyros.title"),
    description: t("gyros.description"),
    imageAlt: t("gyros.imageAlt"),
    href: "/menu#gyros",
  },
  {
    id: "souvlaki",
    title: t("souvlaki.title"),
    description: t("souvlaki.description"),
    imageAlt: t("souvlaki.imageAlt"),
    href: "/menu#souvlaki",
  },
  {
    id: "pites",
    title: t("pites.title"),
    description: t("pites.description"),
    imageAlt: t("pites.imageAlt"),
    href: "/menu#pites",
  },
  {
    id: "merides",
    title: t("merides.title"),
    description: t("merides.description"),
    imageAlt: t("merides.imageAlt"),
    href: "/menu#merides",
  },
  {
    id: "salates",
    title: t("salates.title"),
    description: t("salates.description"),
    imageAlt: t("salates.imageAlt"),
    href: "/menu#salates",
  },
  {
    id: "patates",
    title: t("patates.title"),
    description: t("patates.description"),
    imageAlt: t("patates.imageAlt"),
    href: "/menu#patates",
  },
];
