"use client";

import { ArrowUpRight, Smartphone } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

const APP_URL = "https://saloniki-grill.vercel.app";

export function AppQrCode() {
  return (
    <section className="px-4 py-10 sm:py-16">
      <div className="mx-auto grid max-w-6xl overflow-hidden rounded-[2rem] border border-olive/40 bg-pita text-char shadow-2xl shadow-black/20 md:grid-cols-[1fr_auto] md:items-center">
        <div className="p-7 sm:p-10 lg:p-14">
          <span className="inline-flex items-center gap-2 rounded-full bg-char px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-lemon">
            <Smartphone className="size-4" />
            Direkt auf dem Handy
          </span>
          <h2 className="mt-6 max-w-xl text-3xl font-black leading-tight sm:text-4xl">
            Scannen, Speisekarte öffnen und bestellen.
          </h2>
          <p className="mt-4 max-w-xl text-base leading-7 text-char/70">
            Öffne die Kamera auf deinem Smartphone und richte sie auf den
            QR-Code. So gelangst du direkt zu Der Schöne Grieche.
          </p>
          <a
            href={APP_URL}
            className="mt-7 inline-flex items-center gap-2 rounded-full bg-lemon px-6 py-3 font-black transition-transform hover:-translate-y-0.5"
          >
            App öffnen
            <ArrowUpRight className="size-4" />
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
