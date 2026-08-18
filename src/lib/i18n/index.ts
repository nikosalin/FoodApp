"use client";

import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import enHome from "@/lib/i18n/locales/en/home.json";
import enFood from "@/lib/i18n/locales/en/food.json";
import deFood from "@/lib/i18n/locales/de/food.json";
import deHome from "@/lib/i18n/locales/de/home.json";
import deMenu from "@/lib/i18n/locales/de/menu.json";
import enMenu from "@/lib/i18n/locales/en/menu.json";
import deCart from "@/lib/i18n/locales/de/cart.json";
import enCart from "@/lib/i18n/locales/en/cart.json";
import deCheckout from "@/lib/i18n/locales/de/checkout.json";
import enCheckout from "@/lib/i18n/locales/en/checkout.json";
import grHome from "@/lib/i18n/locales/gr/home.json";
import grFood from "@/lib/i18n/locales/gr/food.json";
import grMenu from "@/lib/i18n/locales/gr/menu.json";
import grCart from "@/lib/i18n/locales/gr/cart.json";
import grCheckout from "@/lib/i18n/locales/gr/checkout.json";
i18n
  .use(initReactI18next) // passes i18n down to react-i18next
  .init({
    lng: "de",
    ns: "home",
    defaultNS: "home",
    resources: {
      en: {
        food: enFood,
        home: enHome,
        menu: enMenu,
        cart: enCart,
        checkout: enCheckout,
      },
      de: {
        food: deFood,
        home: deHome,
        menu: deMenu,
        cart: deCart,
        checkout: deCheckout,
      },
      gr: {
        food: grFood,
        home: grHome,
        menu: grMenu,
        cart: grCart,
        checkout: grCheckout,
      },
    },
    fallbackLng: "de",
    interpolation: {
      escapeValue: false, // react already safes from xss => https://www.i18next.com/translation-function/interpolation#unescape
    },
  });

export default i18n;
