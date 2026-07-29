"use client";

import { ArrowUpRight, Smartphone } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useTranslation } from "react-i18next";

const APP_URL = "https://saloniki-grill.vercel.app";

export function AppQrCode() {
  const { t } = useTranslation("home");

  return (
    <section className="px-4 py-10 sm:py-16">
      <div className="mx-auto grid max-w-6xl overflow-hidden rounded-[2rem] border border-olive/40 bg-pita text-char shadow-2xl shadow-black/20 md:grid-cols-[1fr_auto] md:items-center">
        <div className="p-7 sm:p-10 lg:p-14">
          <span className="line-clamp-1 inline-flex min-h-[2rem] items-center gap-2 rounded-full bg-char px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-lemon">
            <Smartphone className="size-4 shrink-0" />
            {t("appQr.badge")}
          </span>
          <h2 className="mt-6 line-clamp-2 min-h-[5rem] max-w-xl text-3xl font-black leading-tight sm:min-h-[5.5rem] sm:text-4xl">
            {t("appQr.title")}
          </h2>
          <p className="mt-4 line-clamp-3 min-h-[5.25rem] max-w-xl text-base leading-7 text-char/70">
            {t("appQr.description")}
          </p>
          <a
            href={APP_URL}
            className="mt-7 inline-flex w-full max-w-xs items-center justify-center gap-2 rounded-full bg-lemon px-6 py-3 text-center font-black transition-transform hover:-translate-y-0.5 sm:w-auto"
          >
            {t("appQr.openButton")}
            <ArrowUpRight className="size-4 shrink-0" />
          </a>
        </div>

        <div className="flex h-full items-center justify-center bg-char p-7 sm:p-10 lg:p-14">
          <a
            href={APP_URL}
            aria-label="Der Schöne Grieche öffnen"
            className="rounded-[1.75rem] bg-white p-4 shadow-xl sm:p-5"
          >
            <QRCodeSVG
              value={APP_URL}
              size={220}
              level="H"
              includeMargin
              title="QR-Code für Der Schöne Grieche"
              className="h-auto w-[190px] sm:w-[220px]"
            />
          </a>
        </div>
      </div>
    </section>
  );
}
