"use client";

import {
  Bike,
  Check,
  Minus,
  Plus,
  ShoppingBag,
  Store,
  Utensils,
} from "lucide-react";
import { useMemo, useState } from "react";
import type { Restaurant } from "@/features/admin/types";
import type { PublicMenuItem } from "../data/menu";

type OrderType = "table" | "takeaway" | "delivery";

export function PublicMenu({
  restaurant,
  items,
  initialOrderType,
  initialTable,
}: {
  restaurant: Restaurant;
  items: PublicMenuItem[];
  initialOrderType?: OrderType;
  initialTable?: string;
}) {
  const [orderType, setOrderType] = useState<OrderType | undefined>(
    initialOrderType,
  );
  const [tableNumber, setTableNumber] = useState(initialTable ?? "");
  const [cart, setCart] = useState<Record<string, number>>({});

  const total = useMemo(
    () =>
      items.reduce(
        (sum, item) => sum + item.price * (cart[item.id] ?? 0),
        0,
      ),
    [cart, items],
  );
  const count = Object.values(cart).reduce((sum, quantity) => sum + quantity, 0);

  const changeQuantity = (itemId: string, amount: number) => {
    setCart((current) => {
      const quantity = Math.max(0, (current[itemId] ?? 0) + amount);
      return { ...current, [itemId]: quantity };
    });
  };

  return (
    <main className="min-h-screen bg-[#f7f2e8] pb-28 text-stone-950">
      <header className="bg-[#2b2420] px-5 py-10 text-white">
        <div className="mx-auto max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-amber-400">
            Speisekarte
          </p>
          <h1 className="mt-2 text-4xl font-black">{restaurant.name}</h1>
          <p className="mt-2 text-sm text-stone-300">
            {restaurant.address}, {restaurant.city}
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-3xl space-y-7 px-4 py-6">
        <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black">Wie möchtest du bestellen?</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <OrderTypeButton
              active={orderType === "table"}
              icon={Utensils}
              label="Im Restaurant"
              onClick={() => setOrderType("table")}
            />
            <OrderTypeButton
              active={orderType === "takeaway"}
              icon={ShoppingBag}
              label="Abholung"
              onClick={() => setOrderType("takeaway")}
            />
            <OrderTypeButton
              active={orderType === "delivery"}
              icon={Bike}
              label="Lieferung"
              onClick={() => setOrderType("delivery")}
            />
          </div>
          {orderType === "table" && (
            <label className="mt-4 block text-sm font-semibold">
              Tischnummer
              <input
                value={tableNumber}
                onChange={(event) => setTableNumber(event.target.value)}
                className="mt-2 h-11 w-full rounded-xl border border-stone-300 px-3 outline-none focus:border-amber-600"
                placeholder="z. B. 12"
                inputMode="numeric"
              />
            </label>
          )}
        </section>

        {items.length === 0 ? (
          <section className="rounded-3xl bg-white p-10 text-center shadow-sm">
            <Store className="mx-auto size-10 text-stone-400" />
            <h2 className="mt-3 text-xl font-bold">Menü wird vorbereitet</h2>
            <p className="mt-1 text-stone-500">
              Für dieses Restaurant sind noch keine Gerichte veröffentlicht.
            </p>
          </section>
        ) : (
          [...new Set(items.map((item) => item.category))].map((category) => (
            <section key={category}>
              <h2 className="mb-3 text-xl font-black">{category}</h2>
              <div className="grid gap-3">
                {items
                  .filter((item) => item.category === category)
                  .map((item) => {
                    const quantity = cart[item.id] ?? 0;
                    return (
                      <article
                        key={item.id}
                        className="flex items-center justify-between gap-4 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm"
                      >
                        <div>
                          <h3 className="font-bold">{item.name}</h3>
                          <p className="mt-1 text-sm text-stone-500">
                            {item.description}
                          </p>
                          <p className="mt-3 font-black text-amber-700">
                            {formatCurrency(item.price)}
                          </p>
                        </div>
                        {quantity === 0 ? (
                          <button
                            type="button"
                            onClick={() => changeQuantity(item.id, 1)}
                            className="grid size-11 shrink-0 place-items-center rounded-full bg-stone-950 text-white"
                            aria-label={`${item.name} hinzufügen`}
                          >
                            <Plus className="size-5" />
                          </button>
                        ) : (
                          <div className="flex shrink-0 items-center gap-2 rounded-full bg-stone-100 p-1">
                            <button
                              type="button"
                              onClick={() => changeQuantity(item.id, -1)}
                              className="grid size-9 place-items-center rounded-full bg-white"
                              aria-label={`${item.name} entfernen`}
                            >
                              <Minus className="size-4" />
                            </button>
                            <span className="w-5 text-center font-bold">
                              {quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => changeQuantity(item.id, 1)}
                              className="grid size-9 place-items-center rounded-full bg-stone-950 text-white"
                              aria-label={`${item.name} hinzufügen`}
                            >
                              <Plus className="size-4" />
                            </button>
                          </div>
                        )}
                      </article>
                    );
                  })}
              </div>
            </section>
          ))
        )}
      </div>

      {count > 0 && (
        <div className="fixed inset-x-0 bottom-0 border-t border-stone-200 bg-white/95 p-4 backdrop-blur">
          <div className="mx-auto max-w-3xl">
            <button
              type="button"
              disabled={
                !orderType ||
                (orderType === "table" && tableNumber.trim().length === 0)
              }
              className="flex h-14 w-full items-center justify-between rounded-2xl bg-stone-950 px-5 font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
              title="Checkout is enabled after persistent menu pricing and payment credentials are connected"
            >
              <span className="flex items-center gap-2">
                <Check className="size-5" />
                {count} Artikel
              </span>
              <span>{formatCurrency(total)}</span>
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

function OrderTypeButton({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: typeof Store;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-24 flex-col items-center justify-center gap-2 rounded-2xl border-2 p-3 text-sm font-bold transition ${
        active
          ? "border-amber-600 bg-amber-50 text-amber-800"
          : "border-stone-200 hover:border-stone-400"
      }`}
    >
      <Icon className="size-6" />
      {label}
    </button>
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}
