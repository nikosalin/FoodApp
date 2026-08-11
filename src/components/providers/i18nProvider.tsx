"use client";

import { useEffect } from "react";
import i18n from "@/lib/i18n";
import { useCartStore } from "@/features/cart/store/useCartStore";

const LANGUAGE_STORAGE_KEY = "i18nextLng";

export default function I18nProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    const savedLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (savedLanguage === "en" || savedLanguage === "de") {
      void i18n.changeLanguage(savedLanguage);
    }

    void useCartStore.persist.rehydrate();
  }, []);

  return <>{children}</>;
}
