"use client";

import Image from "next/image";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { storeInfo } from "../data/store-info";

export function Hero() {
  const { t } = useTranslation("home");

  return (
    <section className="grid min-h-[calc(100vh-4rem)] overflow-hidden bg-[#fffaf2] lg:grid-cols-2">
      <div className="relative min-h-[42vh] overflow-hidden lg:min-h-full">
        <Image
          src="/home1.png"
          alt="Fresh grilled souvlaki"
          fill
          priority
          sizes="(min-width: 1024px) 50vw, 100vw"
          className="object-cover transition duration-700 hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-char/50 via-transparent to-transparent" />
        <div className="absolute bottom-6 left-6 rounded-2xl bg-tomato px-5 py-3 text-sm font-black uppercase tracking-[0.18em] text-white shadow-xl">
          Grill Saloniki · Köln
        </div>
      </div>

      <div className="relative flex flex-col items-center justify-center overflow-hidden px-6 py-16 text-center lg:px-14">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-lemon/20" />
        <div className="absolute -bottom-24 -left-20 h-72 w-72 rounded-full border-[44px] border-tomato/10" />
        <div className="relative z-10 flex w-full max-w-2xl flex-col items-center">
          <span className="line-clamp-1 min-h-[1.25rem] text-sm font-black uppercase tracking-[0.3em] text-tomato">
            {t("hero.eyebrow")}
          </span>

          <h1 className="mt-4 line-clamp-2 min-h-[4.5rem] text-5xl font-black uppercase leading-[0.95] tracking-tight text-char md:min-h-[6.5rem] md:text-7xl">
            {t("hero.title")}
          </h1>

          <p className="mt-6 line-clamp-2 min-h-[3.5rem] max-w-md text-char/65">
            {t("hero.tagline")}
          </p>

          <span className="mt-3 line-clamp-1 inline-block min-h-[2rem] rotate-[-2deg] rounded-xl bg-lemon px-4 py-1.5 text-sm font-black text-char shadow-sm">
            {t("hero.discount")}
          </span>

          <div className="mt-8 flex w-full flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/menu"
              className="line-clamp-1 w-full max-w-xs rounded-xl bg-tomato px-8 py-3.5 text-center font-black uppercase tracking-wide text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-char sm:w-auto"
            >
              {t("hero.orderButton")}
            </Link>
            <a
              href={`tel:${storeInfo.phone.replace(/\./g, "")}`}
              className="w-full max-w-xs rounded-xl border-2 border-char px-8 py-3 text-center font-black text-char transition hover:bg-char hover:text-white sm:w-auto"
            >
              {storeInfo.phone}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
