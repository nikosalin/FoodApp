"use client";

import {
  Banknote,
  Bike,
  Check,
  CreditCard,
  Minus,
  Plus,
  ShoppingBag,
  Store,
  Utensils,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useEffect } from "react";
import type { Restaurant } from "@/features/admin/types";
import { StripePaymentStep } from "@/features/payments/components/StripePaymentStep";
import type { PublicMenuItem } from "../data/menu";
import type {
  DeliveryQuote,
  RestaurantAvailability,
} from "@/features/restaurants/types";

type OrderType = "table" | "takeaway" | "delivery";
type PaymentMethod = "online" | "cash_on_site" | "cash_on_delivery";
type OnlinePaymentProvider = "stripe" | "paypal";

export function PublicMenu({
  restaurant,
  items,
  initialOrderType,
  initialTable,
  initialPaymentNotice,
  initialTrackingToken,
  stripePublishableKey,
}: {
  restaurant: Restaurant;
  items: PublicMenuItem[];
  initialOrderType?: OrderType;
  initialTable?: string;
  initialPaymentNotice?: "authorized" | "cancelled" | "failed";
  initialTrackingToken?: string;
  stripePublishableKey: string;
}) {
  const [orderType, setOrderType] = useState<OrderType | undefined>(
    initialOrderType,
  );
  const [tableNumber, setTableNumber] = useState(initialTable ?? "");
  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("online");
  const [onlinePaymentProvider, setOnlinePaymentProvider] =
    useState<OnlinePaymentProvider>("stripe");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [deliveryStreet, setDeliveryStreet] = useState("");
  const [deliveryPostalCode, setDeliveryPostalCode] = useState("");
  const [deliveryCity, setDeliveryCity] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(
    initialPaymentNotice === "failed"
      ? "Die PayPal-Zahlung konnte nicht bestätigt werden. Bitte versuche es erneut."
      : "",
  );
  const [success, setSuccess] = useState(
    initialPaymentNotice === "authorized"
      ? `PayPal hat die Zahlung autorisiert. Die Belastung erfolgt nach Annahme der Bestellung.${initialTrackingToken ? " Du kannst den Status unten verfolgen." : ""}`
      : initialPaymentNotice === "cancelled"
        ? "Die PayPal-Zahlung wurde abgebrochen. Dein Warenkorb wurde nicht belastet."
        : "",
  );
  const [stripeStep, setStripeStep] = useState<{
    clientSecret: string;
    orderNumber: string;
    trackingToken: string;
  }>();
  const [availability, setAvailability] = useState<RestaurantAvailability>();
  const [deliveryQuote, setDeliveryQuote] = useState<DeliveryQuote>();
  const [quoteFingerprint, setQuoteFingerprint] = useState("");
  const [quoteBusy, setQuoteBusy] = useState(false);

  useEffect(() => {
    let active = true;
    const load = () => {
      fetch(
        `/api/restaurants/${encodeURIComponent(restaurant.id)}/availability`,
        { cache: "no-store" },
      )
        .then((response) => response.json())
        .then((body: { availability?: RestaurantAvailability }) => {
          if (active && body.availability) {
            setAvailability(body.availability);
            if (!body.availability.cashOnDeliveryEnabled) {
              setPaymentMethod((current) =>
                current === "cash_on_delivery" ? "online" : current,
              );
            }
          }
        })
        .catch(() => undefined);
    };
    load();
    const interval = window.setInterval(load, 60_000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [restaurant.id]);

  const total = useMemo(
    () =>
      items.reduce(
        (sum, item) => sum + item.price * (cart[item.id] ?? 0),
        0,
      ),
    [cart, items],
  );
  const count = Object.values(cart).reduce((sum, quantity) => sum + quantity, 0);
  const deliveryFingerprint = JSON.stringify([
    deliveryStreet.trim(),
    deliveryPostalCode,
    deliveryCity.trim(),
    total,
  ]);
  const activeDeliveryQuote =
    quoteFingerprint === deliveryFingerprint ? deliveryQuote : undefined;
  const checkoutTotal =
    total +
    (orderType === "delivery" ? activeDeliveryQuote?.deliveryFee ?? 0 : 0);

  const changeQuantity = (itemId: string, amount: number) => {
    setCart((current) => {
      const quantity = Math.max(0, (current[itemId] ?? 0) + amount);
      return { ...current, [itemId]: quantity };
    });
  };

  async function requestDeliveryQuote() {
    setQuoteBusy(true);
    setError("");
    try {
      const response = await fetch(
        `/api/restaurants/${encodeURIComponent(
          restaurant.id,
        )}/delivery-quote`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            address: {
              street: deliveryStreet,
              postalCode: deliveryPostalCode,
              city: deliveryCity,
              countryCode: "DE",
            },
            subtotal: total,
          }),
        },
      );
      const body = (await response.json()) as {
        quote?: DeliveryQuote;
        error?: string;
      };
      if (!response.ok || !body.quote) {
        throw new Error(body.error ?? "Lieferadresse konnte nicht geprüft werden.");
      }
      setDeliveryQuote(body.quote);
      setQuoteFingerprint(deliveryFingerprint);
    } catch (reason) {
      setDeliveryQuote(undefined);
      setQuoteFingerprint("");
      setError(
        reason instanceof Error
          ? reason.message
          : "Lieferadresse konnte nicht geprüft werden.",
      );
    } finally {
      setQuoteBusy(false);
    }
  }

  async function submitOrder() {
    if (!orderType || busy) return;
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": crypto.randomUUID(),
        },
        body: JSON.stringify({
          restaurantId: restaurant.id,
          orderType,
          tableNumber,
          customerName,
          customerEmail,
          customerPhone,
          preferredChannel: "email",
          paymentMethod,
          onlinePaymentProvider:
            paymentMethod === "online" ? onlinePaymentProvider : undefined,
          deliveryAddress:
            orderType === "delivery"
              ? {
                  street: deliveryStreet,
                  postalCode: deliveryPostalCode,
                  city: deliveryCity,
                  countryCode: "DE",
                }
              : undefined,
          items: Object.entries(cart)
            .filter(([, quantity]) => quantity > 0)
            .map(([menuItemId, quantity]) => ({ menuItemId, quantity })),
        }),
      });
      const body = (await response.json()) as {
        error?: string;
        message?: string;
        order?: {
          orderNumber: string;
          trackingToken: string;
        };
        payment?: {
          provider?: OnlinePaymentProvider;
          clientSecret?: string;
          checkoutUrl?: string;
        };
      };
      if (!response.ok || !body.order) {
        throw new Error(
          body.message ?? body.error ?? "Bestellung konnte nicht erstellt werden.",
        );
      }
      if (paymentMethod === "online") {
        if (
          onlinePaymentProvider === "paypal" &&
          body.payment?.provider === "paypal" &&
          body.payment.checkoutUrl
        ) {
          window.location.assign(body.payment.checkoutUrl);
          return;
        }
        if (!stripePublishableKey || !body.payment?.clientSecret) {
          throw new Error("Stripe ist für dieses Restaurant noch nicht konfiguriert.");
        }
        setStripeStep({
          clientSecret: body.payment.clientSecret,
          orderNumber: body.order.orderNumber,
          trackingToken: body.order.trackingToken,
        });
      } else {
        setSuccess(`Bestellung ${body.order.orderNumber} wurde gesendet.`);
        setCart({});
      }
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Bestellung fehlgeschlagen.",
      );
    } finally {
      setBusy(false);
    }
  }

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
        {availability && !availability.acceptingOrders && (
          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-950">
            <p className="font-black">Online-Bestellungen sind geschlossen</p>
            <p className="mt-1 text-sm">{availability.message}</p>
            <p className="mt-2 text-xs">
              Die Speisekarte bleibt sichtbar. Bereits aufgegebene Bestellungen
              werden weiterhin bearbeitet.
            </p>
          </section>
        )}
        <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black">Wie möchtest du bestellen?</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <OrderTypeButton
              active={orderType === "table"}
              icon={Utensils}
              label="Im Restaurant"
              onClick={() => {
                setOrderType("table");
                if (paymentMethod === "cash_on_delivery") {
                  setPaymentMethod("cash_on_site");
                }
              }}
            />
            <OrderTypeButton
              active={orderType === "takeaway"}
              icon={ShoppingBag}
              label="Abholung"
              onClick={() => {
                setOrderType("takeaway");
                if (paymentMethod === "cash_on_delivery") {
                  setPaymentMethod("cash_on_site");
                }
              }}
            />
            <OrderTypeButton
              active={orderType === "delivery"}
              icon={Bike}
              label="Lieferung"
              onClick={() => {
                setOrderType("delivery");
                setPaymentMethod("online");
              }}
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
          {orderType && (
            <div className="mt-5 border-t border-stone-200 pt-5">
              <h3 className="text-sm font-black">Zahlungsart</h3>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentMethod("online")}
                  className={`flex min-h-20 items-center gap-3 rounded-2xl border-2 p-3 text-left text-sm font-bold ${
                    paymentMethod === "online"
                      ? "border-amber-600 bg-amber-50 text-amber-800"
                      : "border-stone-200"
                  }`}
                >
                  <CreditCard className="size-5 shrink-0" />
                  Online bezahlen
                </button>
                {orderType === "delivery" &&
                  availability?.cashOnDeliveryEnabled && (
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("cash_on_delivery")}
                      className={`flex min-h-20 items-center gap-3 rounded-2xl border-2 p-3 text-left text-sm font-bold ${
                        paymentMethod === "cash_on_delivery"
                          ? "border-amber-600 bg-amber-50 text-amber-800"
                          : "border-stone-200"
                      }`}
                    >
                      <Banknote className="size-5 shrink-0" />
                      Bar bei Lieferung
                    </button>
                  )}
                <button
                  type="button"
                  disabled={orderType === "delivery"}
                  onClick={() => setPaymentMethod("cash_on_site")}
                  className={`flex min-h-20 items-center gap-3 rounded-2xl border-2 p-3 text-left text-sm font-bold disabled:cursor-not-allowed disabled:opacity-35 ${
                    paymentMethod === "cash_on_site"
                      ? "border-amber-600 bg-amber-50 text-amber-800"
                      : "border-stone-200"
                  }`}
                >
                  <Banknote className="size-5 shrink-0" />
                  {orderType === "takeaway"
                    ? "Bar bei Abholung"
                    : "Bar im Restaurant"}
                </button>
              </div>
              {paymentMethod === "online" && (
                <div className="mt-3 grid grid-cols-2 gap-2 rounded-2xl bg-stone-100 p-2">
                  <button
                    type="button"
                    onClick={() => setOnlinePaymentProvider("stripe")}
                    className={`rounded-xl px-3 py-2 text-sm font-bold ${
                      onlinePaymentProvider === "stripe"
                        ? "bg-white text-stone-950 shadow-sm"
                        : "text-stone-500"
                    }`}
                  >
                    Karte
                  </button>
                  <button
                    type="button"
                    onClick={() => setOnlinePaymentProvider("paypal")}
                    className={`rounded-xl px-3 py-2 text-sm font-bold ${
                      onlinePaymentProvider === "paypal"
                        ? "bg-[#ffc439] text-[#003087] shadow-sm"
                        : "text-stone-500"
                    }`}
                  >
                    PayPal
                  </button>
                </div>
              )}
              {orderType === "takeaway" &&
                paymentMethod === "cash_on_site" && (
                  <p className="mt-3 rounded-xl bg-emerald-50 p-3 text-xs font-semibold text-emerald-800">
                    Du bestätigst, dass du die Bestellung im Restaurant abholst
                    und dort bar bezahlst.
                  </p>
                )}
              {orderType === "delivery" && (
                <p className="mt-3 text-xs text-stone-500">
                  {availability?.cashOnDeliveryEnabled
                    ? "Du kannst online oder bar beim Fahrer bezahlen."
                    : "Dieses Restaurant akzeptiert Lieferbestellungen nur online."}
                </p>
              )}
              {paymentMethod === "cash_on_delivery" && (
                <p className="mt-3 rounded-xl bg-emerald-50 p-3 text-xs font-semibold text-emerald-800">
                  Du bestätigst, dass du den vollständigen Betrag bei Übergabe
                  bar an den Fahrer bezahlst.
                </p>
              )}
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black">Kontaktdaten</h2>
          <p className="mt-1 text-sm text-stone-500">
            Die Bestätigung wird per E-Mail versendet.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-semibold">
              Name
              <input
                value={customerName}
                onChange={(event) => setCustomerName(event.target.value)}
                autoComplete="name"
                className="mt-2 h-11 w-full rounded-xl border border-stone-300 px-3"
              />
            </label>
            <label className="text-sm font-semibold">
              E-Mail
              <input
                type="email"
                value={customerEmail}
                onChange={(event) => setCustomerEmail(event.target.value)}
                autoComplete="email"
                className="mt-2 h-11 w-full rounded-xl border border-stone-300 px-3"
              />
            </label>
            <label className="text-sm font-semibold">
              Telefon {paymentMethod === "cash_on_delivery" ? "(Pflicht)" : ""}
              <input
                type="tel"
                value={customerPhone}
                onChange={(event) => setCustomerPhone(event.target.value)}
                autoComplete="tel"
                className="mt-2 h-11 w-full rounded-xl border border-stone-300 px-3"
              />
            </label>
          </div>
          {orderType === "delivery" && (
            <div className="mt-5 border-t border-stone-200 pt-5">
              <h3 className="font-black">Lieferadresse in Deutschland</h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="text-sm font-semibold sm:col-span-2">
                  Straße und Hausnummer
                  <input
                    value={deliveryStreet}
                    onChange={(event) => setDeliveryStreet(event.target.value)}
                    autoComplete="street-address"
                    className="mt-2 h-11 w-full rounded-xl border border-stone-300 px-3"
                  />
                </label>
                <label className="text-sm font-semibold">
                  Postleitzahl
                  <input
                    value={deliveryPostalCode}
                    onChange={(event) =>
                      setDeliveryPostalCode(event.target.value)
                    }
                    inputMode="numeric"
                    autoComplete="postal-code"
                    maxLength={5}
                    className="mt-2 h-11 w-full rounded-xl border border-stone-300 px-3"
                  />
                </label>
                <label className="text-sm font-semibold">
                  Stadt
                  <input
                    value={deliveryCity}
                    onChange={(event) => setDeliveryCity(event.target.value)}
                    autoComplete="address-level2"
                    className="mt-2 h-11 w-full rounded-xl border border-stone-300 px-3"
                  />
                </label>
              </div>
              <button
                type="button"
                disabled={
                  quoteBusy ||
                  deliveryStreet.trim().length < 3 ||
                  !/^[0-9]{5}$/.test(deliveryPostalCode) ||
                  deliveryCity.trim().length < 2
                }
                onClick={() => void requestDeliveryQuote()}
                className="mt-3 h-10 rounded-xl border border-stone-300 px-4 text-sm font-bold disabled:opacity-40"
              >
                {quoteBusy ? "Adresse wird geprüft…" : "Lieferung prüfen"}
              </button>
              {activeDeliveryQuote && (
                <div
                  className={`mt-3 rounded-xl p-3 text-sm ${
                    activeDeliveryQuote.minimumMet
                      ? "bg-emerald-50 text-emerald-900"
                      : "bg-amber-50 text-amber-900"
                  }`}
                >
                  <p className="font-bold">
                    Entfernung:{" "}
                    {(activeDeliveryQuote.distanceMeters / 1000).toFixed(1)} km
                  </p>
                  <p className="mt-1">
                    Mindestbestellwert:{" "}
                    {formatCurrency(activeDeliveryQuote.minimumOrder)} ·
                    Liefergebühr:{" "}
                    {formatCurrency(activeDeliveryQuote.deliveryFee)}
                  </p>
                  {!activeDeliveryQuote.minimumMet && (
                    <p className="mt-1 font-semibold">
                      Es fehlen{" "}
                      {formatCurrency(
                        activeDeliveryQuote.minimumOrder -
                          activeDeliveryQuote.subtotal,
                      )}
                      .
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
          {error && (
            <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}
          {success && (
            <div className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">
              <p>{success}</p>
              {initialPaymentNotice === "authorized" &&
                initialTrackingToken && (
                  <a
                    className="mt-2 inline-block font-bold underline"
                    href={`/orders/track/${encodeURIComponent(initialTrackingToken)}`}
                  >
                    Bestellstatus öffnen
                  </a>
                )}
            </div>
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
                busy ||
                availability?.acceptingOrders === false ||
                !orderType ||
                customerName.trim().length < 2 ||
                !customerEmail.includes("@") ||
                (paymentMethod === "cash_on_delivery" &&
                  customerPhone.trim().length < 7) ||
                (orderType === "delivery" &&
                  (deliveryStreet.trim().length < 3 ||
                    !/^[0-9]{5}$/.test(deliveryPostalCode) ||
                    deliveryCity.trim().length < 2 ||
                    !activeDeliveryQuote?.minimumMet)) ||
                (orderType === "table" && tableNumber.trim().length === 0)
              }
              onClick={submitOrder}
              className="flex h-14 w-full items-center justify-between rounded-2xl bg-stone-950 px-5 font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
              title="Checkout is enabled after persistent menu pricing and payment credentials are connected"
            >
              <span className="flex items-center gap-2">
                <Check className="size-5" />
                {availability?.acceptingOrders === false
                  ? "Derzeit geschlossen"
                  : busy
                    ? "Wird erstellt…"
                    : `${count} Artikel`}
              </span>
              <span>{formatCurrency(checkoutTotal)}</span>
            </button>
          </div>
        </div>
      )}
      {stripeStep && (
        <StripePaymentStep
          publishableKey={stripePublishableKey}
          clientSecret={stripeStep.clientSecret}
          orderNumber={stripeStep.orderNumber}
          trackingToken={stripeStep.trackingToken}
          onClose={() => {
            setStripeStep(undefined);
            setCart({});
          }}
        />
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
