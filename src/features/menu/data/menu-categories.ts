// import type { TFunction } from "i18next";
// import type { MenuCategoryView } from "../types";

// export const MenuCategoriesList = (t: TFunction): MenuCategoryView[] => [
//   {
//     id: "sandwich",
//     label: t("sandwich.label"),
//     items: [
//       {
//         id: "gyrosPork",
//         name: t("sandwich.items.gyrosPork.name"),
//         description: t("sandwich.items.gyrosPork.description"),
//         price: 4.7,
//       },
//       {
//         id: "gyrosChicken",
//         name: t("sandwich.items.gyrosChicken.name"),
//         description: t("sandwich.items.gyrosChicken.description"),
//         price: 4.7,
//       },
//       {
//         id: "souvlaki",
//         name: t("sandwich.items.souvlaki.name"),
//         description: t("sandwich.items.souvlaki.description"),
//         price: 4.1,
//       },
//     ],
//   },
//   {
//     id: "merides",
//     label: t("merides.label"),
//     items: [
//       {
//         id: "gyrosPork",
//         name: t("merides.items.gyrosPork.name"),
//         description: t("merides.items.gyrosPork.description"),
//         price: 9.2,
//       },
//       {
//         id: "gyrosChicken",
//         name: t("merides.items.gyrosChicken.name"),
//         description: t("merides.items.gyrosChicken.description"),
//         price: 9.2,
//       },
//     ],
//   },
//   {
//     id: "salates",
//     label: t("salates.label"),
//     items: [
//       {
//         id: "greek",
//         name: t("salates.items.greek.name"),
//         description: t("salates.items.greek.description"),
//         price: 5.1,
//       },
//       {
//         id: "caesar",
//         name: t("salates.items.caesar.name"),
//         description: t("salates.items.caesar.description"),
//         price: 4.9,
//       },
//     ],
//   },
// ];
import type { TFunction } from "i18next";
import type { MenuCategoryView } from "../types";

export const MenuCategoriesList = (t: TFunction): MenuCategoryView[] => [
  {
    id: "gyros",
    label: t("gyros.label"),
    items: [
      {
        id: "porkGyrosPita",
        name: t("gyros.items.porkGyrosPita.name"),
        description: t("gyros.items.porkGyrosPita.description"),
        price: 4.7,
      },
      {
        id: "chickenGyrosPita",
        name: t("gyros.items.chickenGyrosPita.name"),
        description: t("gyros.items.chickenGyrosPita.description"),
        price: 4.7,
      },
      {
        id: "epicGyros",
        name: t("gyros.items.epicGyros.name"),
        description: t("gyros.items.epicGyros.description"),
        price: 4.5,
      },
    ],
  },
  {
    id: "souvlaki",
    label: t("souvlaki.label"),
    items: [
      {
        id: "porkSouvlakiPita",
        name: t("souvlaki.items.porkSouvlakiPita.name"),
        description: t("souvlaki.items.porkSouvlakiPita.description"),
        price: 4.1,
      },
      {
        id: "clubSouvlaki",
        name: t("souvlaki.items.clubSouvlaki.name"),
        description: t("souvlaki.items.clubSouvlaki.description"),
        price: 6.9,
      },
    ],
  },
  {
    id: "pites",
    label: t("pites.label"),
    items: [
      {
        id: "chickenPita",
        name: t("pites.items.chickenPita.name"),
        description: t("pites.items.chickenPita.description"),
        price: 3.8,
      },
    ],
  },
  {
    id: "merides",
    label: t("merides.label"),
    items: [
      {
        id: "gyrosPorkPlate",
        name: t("merides.items.gyrosPorkPlate.name"),
        description: t("merides.items.gyrosPorkPlate.description"),
        price: 9.2,
      },
      {
        id: "gentleGiant",
        name: t("merides.items.gentleGiant.name"),
        description: t("merides.items.gentleGiant.description"),
        price: 7.2,
      },
    ],
  },
  {
    id: "salates",
    label: t("salates.label"),
    items: [
      {
        id: "greekSalad",
        name: t("salates.items.greekSalad.name"),
        description: t("salates.items.greekSalad.description"),
        price: 5.1,
      },
      {
        id: "caesarSalad",
        name: t("salates.items.caesarSalad.name"),
        description: t("salates.items.caesarSalad.description"),
        price: 4.9,
      },
    ],
  },
  {
    id: "patates",
    label: t("patates.label"),
    items: [
      {
        id: "classicFries",
        name: t("patates.items.classicFries.name"),
        description: t("patates.items.classicFries.description"),
        price: 3.4,
      },
    ],
  },
];
