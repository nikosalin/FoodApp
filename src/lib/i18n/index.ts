"use client";

import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";

import enHome from "@/lib/i18n/locales/en/home.json";

import deHome from "@/lib/i18n/locales/de/home.json";

i18n
  .use(LanguageDetector)
  .use(initReactI18next) // passes i18n down to react-i18next
  .init({
    ns: "home",
    defaultNS: "home",
    resources: {
      en: {
        home: enHome,
      },
      de: {
        home: deHome,
      },
    },
    fallbackLng: "de",
    interpolation: {
      escapeValue: false, // react already safes from xss => https://www.i18next.com/translation-function/interpolation#unescape
    },
  });

export default i18n;
