"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import { storeInfo } from "../data/store-info";

export function Hero() {
  const { t } = useTranslation("home");

  return (
    <section className="relative flex min-h-[85vh] flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-char via-char/95 to-char px-4 text-center">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(232,163,61,0.15),transparent_60%)]" />

      <div className="relative z-10 flex w-full max-w-2xl flex-col items-center">
        <span className="line-clamp-1 min-h-[1.25rem] text-sm font-bold tracking-[0.3em] text-tomato">
          {t("hero.eyebrow")}
        </span>

        <h1 className="mt-4 line-clamp-2 min-h-[4.5rem] text-5xl font-black tracking-wide text-pita md:min-h-[6.5rem] md:text-7xl">
          {t("hero.title")}
        </h1>

        <p className="mt-6 line-clamp-2 min-h-[3.5rem] max-w-md text-pita/80">
          {t("hero.tagline")}
        </p>

        <span className="mt-3 line-clamp-1 inline-block min-h-[2rem] rounded-full border border-lemon/40 px-4 py-1 text-sm font-semibold text-lemon">
          {t("hero.discount")}
        </span>

        <div className="mt-8 flex w-full flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link
            href="/menu"
            className="line-clamp-1 w-full max-w-xs rounded-full bg-lemon px-8 py-3 text-center font-bold text-char transition-colors hover:bg-lemon/90 sm:w-auto"
          >
            {t("hero.orderButton")}
          </Link>
          <a
            href={`tel:${storeInfo.phone.replace(/\./g, "")}`}
            className="w-full max-w-xs rounded-full border border-pita/30 px-8 py-3 text-center font-bold text-pita transition-colors hover:bg-pita/10 sm:w-auto"
          >
            {storeInfo.phone}
          </a>
        </div>
      </div>
    </section>
  );
}
