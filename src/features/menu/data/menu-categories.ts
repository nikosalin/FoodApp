// // import type { TFunction } from "i18next";
// // import type { MenuCategoryView } from "../types";

// // export const MenuCategoriesList = (t: TFunction): MenuCategoryView[] => [
// //   {
// //     id: "sandwich",
// //     label: t("sandwich.label"),
// //     items: [
// //       {
// //         id: "gyrosPork",
// //         name: t("sandwich.items.gyrosPork.name"),
// //         description: t("sandwich.items.gyrosPork.description"),
// //         price: 4.7,
// //       },
// //       {
// //         id: "gyrosChicken",
// //         name: t("sandwich.items.gyrosChicken.name"),
// //         description: t("sandwich.items.gyrosChicken.description"),
// //         price: 4.7,
// //       },
// //       {
// //         id: "souvlaki",
// //         name: t("sandwich.items.souvlaki.name"),
// //         description: t("sandwich.items.souvlaki.description"),
// //         price: 4.1,
// //       },
// //     ],
// //   },
// //   {
// //     id: "merides",
// //     label: t("merides.label"),
// //     items: [
// //       {
// //         id: "gyrosPork",
// //         name: t("merides.items.gyrosPork.name"),
// //         description: t("merides.items.gyrosPork.description"),
// //         price: 9.2,
// //       },
// //       {
// //         id: "gyrosChicken",
// //         name: t("merides.items.gyrosChicken.name"),
// //         description: t("merides.items.gyrosChicken.description"),
// //         price: 9.2,
// //       },
// //     ],
// //   },
// //   {
// //     id: "salates",
// //     label: t("salates.label"),
// //     items: [
// //       {
// //         id: "greek",
// //         name: t("salates.items.greek.name"),
// //         description: t("salates.items.greek.description"),
// //         price: 5.1,
// //       },
// //       {
// //         id: "caesar",
// //         name: t("salates.items.caesar.name"),
// //         description: t("salates.items.caesar.description"),
// //         price: 4.9,
// //       },
// //     ],
// //   },
// // ];
// import type { TFunction } from "i18next";
// import type { MenuCategoryView } from "../types";

// export const MenuCategoriesList = (t: TFunction): MenuCategoryView[] => [
//   {
//     id: "gyros",
//     label: t("gyros.label"),
//     items: [
//       {
//         id: "porkGyrosPita",
//         name: t("gyros.items.porkGyrosPita.name"),
//         description: t("gyros.items.porkGyrosPita.description"),
//         price: 4.7,
//       },
//       {
//         id: "chickenGyrosPita",
//         name: t("gyros.items.chickenGyrosPita.name"),
//         description: t("gyros.items.chickenGyrosPita.description"),
//         price: 4.7,
//       },
//       {
//         id: "epicGyros",
//         name: t("gyros.items.epicGyros.name"),
//         description: t("gyros.items.epicGyros.description"),
//         price: 4.5,
//       },
//     ],
//   },
//   {
//     id: "souvlaki",
//     label: t("souvlaki.label"),
//     items: [
//       {
//         id: "porkSouvlakiPita",
//         name: t("souvlaki.items.porkSouvlakiPita.name"),
//         description: t("souvlaki.items.porkSouvlakiPita.description"),
//         price: 4.1,
//       },
//       {
//         id: "clubSouvlaki",
//         name: t("souvlaki.items.clubSouvlaki.name"),
//         description: t("souvlaki.items.clubSouvlaki.description"),
//         price: 6.9,
//       },
//     ],
//   },
//   {
//     id: "pites",
//     label: t("pites.label"),
//     items: [
//       {
//         id: "chickenPita",
//         name: t("pites.items.chickenPita.name"),
//         description: t("pites.items.chickenPita.description"),
//         price: 3.8,
//       },
//     ],
//   },
//   {
//     id: "merides",
//     label: t("merides.label"),
//     items: [
//       {
//         id: "gyrosPorkPlate",
//         name: t("merides.items.gyrosPorkPlate.name"),
//         description: t("merides.items.gyrosPorkPlate.description"),
//         price: 9.2,
//       },
//       {
//         id: "gentleGiant",
//         name: t("merides.items.gentleGiant.name"),
//         description: t("merides.items.gentleGiant.description"),
//         price: 7.2,
//       },
//     ],
//   },
//   {
//     id: "salates",
//     label: t("salates.label"),
//     items: [
//       {
//         id: "greekSalad",
//         name: t("salates.items.greekSalad.name"),
//         description: t("salates.items.greekSalad.description"),
//         price: 5.1,
//       },
//       {
//         id: "caesarSalad",
//         name: t("salates.items.caesarSalad.name"),
//         description: t("salates.items.caesarSalad.description"),
//         price: 4.9,
//       },
//     ],
//   },
//   {
//     id: "patates",
//     label: t("patates.label"),
//     items: [
//       {
//         id: "classicFries",
//         name: t("patates.items.classicFries.name"),
//         description: t("patates.items.classicFries.description"),
//         price: 3.4,
//       },
//     ],
//   },
// ];
import type { TFunction } from "i18next";
import type { MenuCategoryView } from "../types";

export const MenuCategoriesList = (t: TFunction): MenuCategoryView[] => [
  {
    id: "popular",
    label: t("popular.label"),
    items: [
      {
        id: "gyrosPlate",
        name: t("gyrosPita.items.gyrosPlate.name"),
        description: t("gyrosPita.items.gyrosPlate.description"),
        price: 16.5,
      },
      {
        id: "gyrosPitaSaloniki",
        name: t("gyrosPita.items.gyrosPitaSaloniki.name"),
        description: t("gyrosPita.items.gyrosPitaSaloniki.description"),
        price: 8.5,
      },
    ],
  },
  {
    id: "salads",
    label: t("salads.label"),
    items: [
      {
        id: "fetaSalad",
        name: t("salads.items.fetaSalad.name"),
        description: t("salads.items.fetaSalad.description"),
        price: 3.0,
      },
      {
        id: "tzatzikiPortion",
        name: t("salads.items.tzatzikiPortion.name"),
        description: t("salads.items.tzatzikiPortion.description"),
        price: 5.0,
      },
      {
        id: "whiteCabbageSalad",
        name: t("salads.items.whiteCabbageSalad.name"),
        description: t("salads.items.whiteCabbageSalad.description"),
        price: 5.0,
      },
      {
        id: "mixedSalad",
        name: t("salads.items.mixedSalad.name"),
        description: t("salads.items.mixedSalad.description"),
        price: 5.0,
      },
      {
        id: "farmersSalad",
        name: t("salads.items.farmersSalad.name"),
        description: t("salads.items.farmersSalad.description"),
        price: 7.0,
      },
      {
        id: "peperoni",
        name: t("salads.items.peperoni.name"),
        description: t("salads.items.peperoni.description"),
        price: 6.5,
      },
      {
        id: "olives",
        name: t("salads.items.olives.name"),
        description: t("salads.items.olives.description"),
        price: 6.5,
      },
    ],
  },
  {
    id: "gyrosPita",
    label: t("gyrosPita.label"),
    items: [
      {
        id: "gyrosPlate",
        name: t("gyrosPita.items.gyrosPlate.name"),
        description: t("gyrosPita.items.gyrosPlate.description"),
        price: 16.5,
      },
      {
        id: "vegetarianPita",
        name: t("gyrosPita.items.vegetarianPita.name"),
        description: t("gyrosPita.items.vegetarianPita.description"),
        price: 7.0,
      },
      {
        id: "gyrosPitaSaloniki",
        name: t("gyrosPita.items.gyrosPitaSaloniki.name"),
        description: t("gyrosPita.items.gyrosPitaSaloniki.description"),
        price: 8.5,
      },
      {
        id: "gyrosPitaWithSalad",
        name: t("gyrosPita.items.gyrosPitaWithSalad.name"),
        description: t("gyrosPita.items.gyrosPitaWithSalad.description"),
        price: 9.5,
      },
      {
        id: "gyrosPitaSpecial",
        name: t("gyrosPita.items.gyrosPitaSpecial.name"),
        description: t("gyrosPita.items.gyrosPitaSpecial.description"),
        price: 10.0,
      },
      {
        id: "gyrosPlain",
        name: t("gyrosPita.items.gyrosPlain.name"),
        description: t("gyrosPita.items.gyrosPlain.description"),
        price: 11.0,
      },
      {
        id: "pitaNoGyros",
        name: t("gyrosPita.items.pitaNoGyros.name"),
        description: t("gyrosPita.items.pitaNoGyros.description"),
        price: 6.5,
      },
      {
        id: "gyrosBox",
        name: t("gyrosPita.items.gyrosBox.name"),
        description: t("gyrosPita.items.gyrosBox.description"),
        price: 7.5,
      },
      {
        id: "gyrosMetaxa",
        name: t("gyrosPita.items.gyrosMetaxa.name"),
        description: t("gyrosPita.items.gyrosMetaxa.description"),
        price: 16.0,
      },
      {
        id: "gyrosMetaxaRiceNoodles",
        name: t("gyrosPita.items.gyrosMetaxaRiceNoodles.name"),
        description: t("gyrosPita.items.gyrosMetaxaRiceNoodles.description"),
        price: 16.0,
      },
    ],
  },
  {
    id: "grill",
    label: t("grill.label"),
    items: [
      {
        id: "bifteki",
        name: t("grill.items.bifteki.name"),
        description: t("grill.items.bifteki.description"),
        price: 18.0,
      },
      {
        id: "porkSouvlaki",
        name: t("grill.items.porkSouvlaki.name"),
        description: t("grill.items.porkSouvlaki.description"),
        price: 17.0,
      },
      {
        id: "soutzoukakia",
        name: t("grill.items.soutzoukakia.name"),
        description: t("grill.items.soutzoukakia.description"),
        price: 16.0,
      },
      {
        id: "grillPlatter",
        name: t("grill.items.grillPlatter.name"),
        description: t("grill.items.grillPlatter.description"),
        price: 18.0,
      },
    ],
  },
  {
    id: "sides",
    label: t("sides.label"),
    items: [
      {
        id: "fries",
        name: t("sides.items.fries.name"),
        description: t("sides.items.fries.description"),
        price: 4.0,
      },
      {
        id: "bratwurst",
        name: t("sides.items.bratwurst.name"),
        description: t("sides.items.bratwurst.description"),
        price: 3.5,
      },
      {
        id: "currywurst",
        name: t("sides.items.currywurst.name"),
        description: t("sides.items.currywurst.description"),
        price: 4.5,
      },
      {
        id: "currywurstFries",
        name: t("sides.items.currywurstFries.name"),
        description: t("sides.items.currywurstFries.description"),
        price: 8.0,
      },
      {
        id: "plainPitaBread",
        name: t("sides.items.plainPitaBread.name"),
        description: t("sides.items.plainPitaBread.description"),
        price: 2.5,
      },
      {
        id: "riceNoodles",
        name: t("sides.items.riceNoodles.name"),
        description: t("sides.items.riceNoodles.description"),
        price: 5.0,
      },
    ],
  },
  {
    id: "sauces",
    label: t("sauces.label"),
    items: [
      {
        id: "ketchup",
        name: t("sauces.items.ketchup.name"),
        description: t("sauces.items.ketchup.description"),
        price: 1.0,
      },
      {
        id: "mayonnaise",
        name: t("sauces.items.mayonnaise.name"),
        description: t("sauces.items.mayonnaise.description"),
        price: 1.0,
      },
      {
        id: "saladMayo",
        name: t("sauces.items.saladMayo.name"),
        description: t("sauces.items.saladMayo.description"),
        price: 1.0,
      },
      {
        id: "tzatzikiSauce",
        name: t("sauces.items.tzatzikiSauce.name"),
        description: t("sauces.items.tzatzikiSauce.description"),
        price: 2.5,
      },
      {
        id: "curryKetchup",
        name: t("sauces.items.curryKetchup.name"),
        description: t("sauces.items.curryKetchup.description"),
        price: 1.0,
      },
      {
        id: "mustard",
        name: t("sauces.items.mustard.name"),
        description: t("sauces.items.mustard.description"),
        price: 1.0,
      },
    ],
  },
  {
    id: "drinksNonAlcoholic",
    label: t("drinksNonAlcoholic.label"),
    items: [
      {
        id: "stillWater",
        name: t("drinksNonAlcoholic.items.stillWater.name"),
        description: t("drinksNonAlcoholic.items.stillWater.description"),
        price: 2.85,
      },
      {
        id: "cola1l",
        name: t("drinksNonAlcoholic.items.cola1l.name"),
        description: t("drinksNonAlcoholic.items.cola1l.description"),
        price: 4.85,
      },
      {
        id: "cola033",
        name: t("drinksNonAlcoholic.items.cola033.name"),
        description: t("drinksNonAlcoholic.items.cola033.description"),
        price: 3.25,
      },
      {
        id: "fanta1l",
        name: t("drinksNonAlcoholic.items.fanta1l.name"),
        description: t("drinksNonAlcoholic.items.fanta1l.description"),
        price: 4.85,
      },
      {
        id: "sprite033",
        name: t("drinksNonAlcoholic.items.sprite033.name"),
        description: t("drinksNonAlcoholic.items.sprite033.description"),
        price: 3.25,
      },
    ],
  },
  {
    id: "drinksAlcoholic",
    label: t("drinksAlcoholic.label"),
    items: [
      {
        id: "koelsch",
        name: t("drinksAlcoholic.items.koelsch.name"),
        description: t("drinksAlcoholic.items.koelsch.description"),
        price: 3.42,
      },
      {
        id: "mythos",
        name: t("drinksAlcoholic.items.mythos.name"),
        description: t("drinksAlcoholic.items.mythos.description"),
        price: 3.92,
      },
      {
        id: "retsina",
        name: t("drinksAlcoholic.items.retsina.name"),
        description: t("drinksAlcoholic.items.retsina.description"),
        price: 8.0,
      },
      {
        id: "ouzo",
        name: t("drinksAlcoholic.items.ouzo.name"),
        description: t("drinksAlcoholic.items.ouzo.description"),
        price: 3.5,
      },
    ],
  },
];
