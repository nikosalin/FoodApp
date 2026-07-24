"use client";

import { Download, ExternalLink, Printer, QrCode } from "lucide-react";
import { useMemo, useState, useSyncExternalStore } from "react";
import { QRCodeSVG } from "qrcode.react";
import type { Restaurant } from "../types";
import {
  AdminCard,
  fieldClassName,
  primaryButtonClassName,
  secondaryButtonClassName,
} from "./AdminUi";

export function RestaurantQrCard({
  restaurant,
}: {
  restaurant: Restaurant;
}) {
  const origin = useSyncExternalStore(
    () => () => undefined,
    () => window.location.origin,
    () => "",
  );
  const [tableNumber, setTableNumber] = useState("");

  const menuUrl = useMemo(() => {
    if (!origin) return "";
    const url = new URL(`/menu/${restaurant.slug}`, origin);
    if (tableNumber.trim()) {
      url.searchParams.set("orderType", "table");
      url.searchParams.set("table", tableNumber.trim());
    }
    return url.toString();
  }, [origin, restaurant.slug, tableNumber]);

  const download = () => {
    const svg = document.getElementById(`qr-${restaurant.id}`);
    if (!svg) return;
    const source = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
    const href = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = href;
    link.download = `${restaurant.slug}${tableNumber ? `-table-${tableNumber}` : ""}-menu-qr.svg`;
    link.click();
    URL.revokeObjectURL(href);
  };

  return (
    <AdminCard className="qr-admin-card">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <QrCode className="size-5 text-amber-700" />
            <h2 className="text-xl font-black">Printable menu QR</h2>
          </div>
          <p className="mt-2 text-sm text-stone-500">
            Print one general card for the counter, or enter a table number to
            create a QR code that preselects dine-in and that table.
          </p>

          <label className="mt-5 block text-sm font-semibold">
            Optional table number
            <input
              className={`${fieldClassName} mt-2`}
              value={tableNumber}
              onChange={(event) =>
                setTableNumber(
                  event.target.value.replace(/[^A-Za-z0-9-]/g, "").slice(0, 12),
                )
              }
              placeholder="Leave empty for the general menu"
            />
          </label>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              className={primaryButtonClassName}
              onClick={() => window.print()}
              disabled={!menuUrl}
            >
              <Printer className="size-4" />
              Print card
            </button>
            <button
              type="button"
              className={secondaryButtonClassName}
              onClick={download}
              disabled={!menuUrl}
            >
              <Download className="size-4" />
              Download SVG
            </button>
            {menuUrl && (
              <a
                href={menuUrl}
                target="_blank"
                rel="noreferrer"
                className={secondaryButtonClassName}
              >
                <ExternalLink className="size-4" />
                Test menu
              </a>
            )}
          </div>
        </div>

        <PrintableCard
          restaurant={restaurant}
          menuUrl={menuUrl}
          tableNumber={tableNumber}
        />
      </div>
    </AdminCard>
  );
}

function PrintableCard({
  restaurant,
  menuUrl,
  tableNumber,
}: {
  restaurant: Restaurant;
  menuUrl: string;
  tableNumber: string;
}) {
  return (
    <section className="qr-print-sheet mx-auto w-full max-w-sm rounded-[2rem] border-2 border-stone-900 bg-[#f7f2e8] p-7 text-center shadow-sm">
      <p className="text-xs font-black uppercase tracking-[0.28em] text-amber-700">
        {tableNumber ? `Tisch ${tableNumber}` : "Direkt bestellen"}
      </p>
      <h3 className="mt-3 text-3xl font-black">{restaurant.name}</h3>
      <p className="mt-2 text-sm text-stone-600">
        QR-Code mit der Handykamera scannen, Speisekarte öffnen und bestellen.
      </p>
      <div className="mx-auto mt-6 w-fit rounded-2xl bg-white p-4">
        {menuUrl ? (
          <QRCodeSVG
            id={`qr-${restaurant.id}`}
            value={menuUrl}
            size={230}
            level="H"
            includeMargin
            title={`Speisekarte von ${restaurant.name}`}
          />
        ) : (
          <div className="size-[230px] animate-pulse rounded-xl bg-stone-100" />
        )}
      </div>
      <p className="mt-5 text-lg font-black">Scannen · Auswählen · Genießen</p>
      <p className="mt-2 break-all text-[10px] text-stone-500">{menuUrl}</p>
    </section>
  );
}
