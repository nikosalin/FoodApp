"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { ArrowLeft, Banknote, Bike, CreditCard, LockKeyhole, MapPin, ShoppingBag, Utensils } from "lucide-react";
import { useCartStore } from "@/features/cart/store/useCartStore";
import { getCartTotal } from "@/features/cart/lib/selectors";
import { StripePaymentStep } from "@/features/payments/components/StripePaymentStep";
import { OrderType, PaymentMethod, StripeStep } from "../types";
import { useTranslation } from "react-i18next";
import type {
  DeliveryQuote,
  RestaurantAvailability,
} from "@/features/restaurants/types";

export function CheckoutPage({
  stripePublishableKey,
}: {
  stripePublishableKey: string;
}) {
  const router = useRouter();
  const items = useCartStore((state) => state.items);
  const restaurantId = useCartStore((state) => state.restaurantId);
  const clearCart = useCartStore((state) => state.clearCart);
  const idempotencyKey = useRef(crypto.randomUUID());
  const [orderType, setOrderType] = useState<OrderType>("delivery");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("online");
  const [tableNumber, setTableNumber] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerNotes, setCustomerNotes] = useState("");
  const [deliveryStreet, setDeliveryStreet] = useState("");
  const [deliveryPostalCode, setDeliveryPostalCode] = useState("");
  const [deliveryCity, setDeliveryCity] = useState("");
  const [availability, setAvailability] = useState<RestaurantAvailability>();
  const [deliveryQuote, setDeliveryQuote] = useState<DeliveryQuote>();
  const [quoteFingerprint, setQuoteFingerprint] = useState("");
  const [quoteBusy, setQuoteBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [stripeStep, setStripeStep] = useState<StripeStep>();
  const [paymentOpen, setPaymentOpen] = useState(false);

  const subtotal = getCartTotal(items);
  const deliveryFingerprint = JSON.stringify([
    deliveryStreet.trim(),
    deliveryPostalCode,
    deliveryCity.trim(),
    subtotal,
  ]);
  const activeDeliveryQuote =
    quoteFingerprint === deliveryFingerprint ? deliveryQuote : undefined;
  const total =
    subtotal +
    (orderType === "delivery" ? activeDeliveryQuote?.deliveryFee ?? 0 : 0);

  const { t } = useTranslation("checkout");

  useEffect(() => {
    if (!restaurantId) return;
    let active = true;
    fetch(`/api/restaurants/${encodeURIComponent(restaurantId)}/availability`, {
      cache: "no-store",
    })
      .then((response) => response.json())
      .then((body: { availability?: RestaurantAvailability }) => {
        if (!active || !body.availability) return;
        const nextAvailability = body.availability;
        setAvailability(nextAvailability);
        setOrderType((current) => {
          if (current === "delivery" && nextAvailability.acceptsDelivery !== false) return current;
          if (current === "takeaway" && nextAvailability.acceptsTakeaway !== false) return current;
          if (current === "table" && nextAvailability.acceptsTable !== false) return current;
          if (nextAvailability.acceptsDelivery !== false) return "delivery";
          if (nextAvailability.acceptsTakeaway !== false) return "takeaway";
          if (nextAvailability.acceptsTable !== false) return "table";
          return "delivery";
        });
        if (!nextAvailability.cashOnDeliveryEnabled) {
          setPaymentMethod((current) =>
            current === "cash_on_delivery" ? "online" : current,
          );
        }
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [restaurantId]);

  async function requestDeliveryQuote() {
    if (!restaurantId) return;
    setQuoteBusy(true);
    setError("");
    try {
      const response = await fetch(
        `/api/restaurants/${encodeURIComponent(restaurantId)}/delivery-quote`,
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
            subtotal,
          }),
        },
      );
      const body = (await response.json()) as {
        quote?: DeliveryQuote;
        error?: string;
      };
      if (!response.ok || !body.quote) {
        throw new Error(body.error ?? t("delivery.errors.quoteFailed"));
      }
      setDeliveryQuote(body.quote);
      setQuoteFingerprint(deliveryFingerprint);
    } catch (reason) {
      setDeliveryQuote(undefined);
      setQuoteFingerprint("");
      setError(
        reason instanceof Error ? reason.message : t("delivery.errors.quoteFailed"),
      );
    } finally {
      setQuoteBusy(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (
      busy ||
      !restaurantId ||
      items.length === 0 ||
      (orderType === "delivery" &&
        (!activeDeliveryQuote || !activeDeliveryQuote.minimumMet))
    ) return;
    if (stripeStep) {
      setPaymentOpen(true);
      return;
    }

    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey.current,
        },
        body: JSON.stringify({
          restaurantId,
          orderType,
          tableNumber: orderType === "table" ? tableNumber : undefined,
          deliveryAddress:
            orderType === "delivery"
              ? {
                  street: deliveryStreet,
                  postalCode: deliveryPostalCode,
                  city: deliveryCity,
                  countryCode: "DE",
                }
              : undefined,
          customerName,
          customerEmail,
          customerPhone,
          customerNotes,
          preferredChannel: "email",
          paymentMethod,
          onlinePaymentProvider:
            paymentMethod === "online" ? "stripe" : undefined,
          items: items.flatMap((item) => [
            {
              menuItemId: item.menuItemId,
              quantity: item.quantity,
              excludedIngredients: item.excludedIngredients,
            },
            ...(item.selectedExtras ?? []).map((extra) => ({
              menuItemId: extra.menuItemId,
              quantity: item.quantity,
              excludedIngredients: [],
            })),
          ]),
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
          clientSecret?: string;
        };
      };
      if (!response.ok || !body.order) {
        throw new Error(body.message ?? body.error ?? t("errors.orderFailed"));
      }

      if (paymentMethod === "online") {
        if (!stripePublishableKey || !body.payment?.clientSecret) {
          throw new Error(t("errors.stripeNotConfigured"));
        }
        setStripeStep({
          clientSecret: body.payment.clientSecret,
          orderNumber: body.order.orderNumber,
          trackingToken: body.order.trackingToken,
        });
        setPaymentOpen(true);
        return;
      }

      clearCart();
      router.push(
        `/orders/track/${encodeURIComponent(body.order.trackingToken)}`,
      );
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : t("errors.orderFailed"),
      );
    } finally {
      setBusy(false);
    }
  }

  if (items.length === 0) {
    return (
      <section className="mx-auto max-w-2xl px-4 py-24 text-center">
        <div className="mx-auto grid size-16 place-items-center rounded-full bg-secondary text-primary">
          <ShoppingBag className="size-7" aria-hidden="true" />
        </div>
        <h1 className="mt-6 text-3xl font-black text-char">{t("emptyCart.title")}</h1>
        <p className="mt-3 text-muted-foreground">{t("emptyCart.description")}</p>
        <Link
          href="/menu"
          className="mt-6 inline-flex rounded-full bg-primary px-6 py-3 font-bold text-white transition hover:bg-primary/90"
        >
          {t("emptyCart.browseMenu")}
        </Link>
      </section>
    );
  }

  return (
    <>
      <form
        onSubmit={submit}
        className="mx-auto grid max-w-5xl gap-5 px-3 py-6 sm:gap-8 sm:px-4 sm:py-10 lg:grid-cols-[minmax(0,1fr)_22rem] lg:py-14"
      >
        <header className="lg:col-span-2">
          <Link href="/cart" className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline sm:mb-6">
            <ArrowLeft className="size-4" aria-hidden="true" />
            {t("editCart")}
          </Link>
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-primary/70">
            {t("eyebrow")}
          </p>
          <h1 className="mt-2 text-3xl font-black text-char sm:text-4xl">{t("title")}</h1>
        </header>
        <div className="space-y-4 sm:space-y-6">
          <CheckoutSection title={t("orderType.title")}>
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {availability?.acceptsDelivery !== false && (
                <ChoiceButton
                  active={orderType === "delivery"}
                  label={t("orderType.delivery.label")}
                  description={t("orderType.delivery.description")}
                  icon={Bike}
                  onClick={() => {
                    setOrderType("delivery");
                    if (paymentMethod === "cash_on_site") setPaymentMethod("online");
                  }}
                />
              )}
              {availability?.acceptsTakeaway !== false && (
                <ChoiceButton
                  active={orderType === "takeaway"}
                  label={t("orderType.takeaway.label")}
                  description={t("orderType.takeaway.description")}
                  icon={ShoppingBag}
                  onClick={() => {
                    setOrderType("takeaway");
                    if (paymentMethod === "cash_on_delivery") setPaymentMethod("online");
                  }}
                />
              )}
              {availability?.acceptsTable !== false && (
                <ChoiceButton
                  active={orderType === "table"}
                  label={t("orderType.table.label")}
                  description={t("orderType.table.description")}
                  icon={Utensils}
                  onClick={() => {
                    setOrderType("table");
                    if (paymentMethod === "cash_on_delivery") setPaymentMethod("online");
                  }}
                />
              )}
            </div>
            {orderType === "table" && (
              <label className="mt-4 block text-sm font-semibold text-char">
                {t("orderType.tableNumberLabel")}
                <input
                  required
                  value={tableNumber}
                  onChange={(event) => setTableNumber(event.target.value)}
                  maxLength={12}
                  className={inputClass}
                />
              </label>
            )}
            {orderType === "delivery" && (
              <div className="mt-4 border-t border-border pt-4 sm:mt-5 sm:pt-5">
                <div className="flex items-center gap-2 text-sm font-black text-char">
                  <MapPin className="size-4 text-primary" aria-hidden="true" />
                  {t("delivery.title")}
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3 sm:gap-4">
                  <div className="col-span-2">
                  <Field label={t("delivery.street")}>
                    <input
                      required
                      value={deliveryStreet}
                      onChange={(event) => setDeliveryStreet(event.target.value)}
                      autoComplete="street-address"
                      className={inputClass}
                    />
                  </Field>
                  </div>
                  <Field label={t("delivery.postalCode")}>
                    <input
                      required
                      value={deliveryPostalCode}
                      onChange={(event) => setDeliveryPostalCode(event.target.value)}
                      inputMode="numeric"
                      autoComplete="postal-code"
                      maxLength={5}
                      className={inputClass}
                    />
                  </Field>
                  <Field label={t("delivery.city")}>
                    <input
                      required
                      value={deliveryCity}
                      onChange={(event) => setDeliveryCity(event.target.value)}
                      autoComplete="address-level2"
                      className={inputClass}
                    />
                  </Field>
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
                  className="mt-3 h-10 rounded-xl border border-primary/25 bg-secondary px-4 text-sm font-bold text-primary transition hover:bg-secondary/70 disabled:cursor-not-allowed disabled:opacity-45 sm:mt-4 sm:h-11"
                >
                  {quoteBusy ? t("delivery.checking") : t("delivery.check")}
                </button>
                {activeDeliveryQuote && (
                  <div className={`mt-4 rounded-2xl p-4 text-sm ${activeDeliveryQuote.minimumMet ? "bg-emerald-50 text-emerald-900" : "bg-amber-50 text-amber-900"}`}>
                    <p className="font-bold">
                      {t("delivery.distance", { distance: (activeDeliveryQuote.distanceMeters / 1000).toFixed(1) })}
                    </p>
                    <p className="mt-1">
                      {t("delivery.quote", {
                        minimum: activeDeliveryQuote.minimumOrder.toFixed(2),
                        fee: activeDeliveryQuote.deliveryFee.toFixed(2),
                      })}
                    </p>
                    {!activeDeliveryQuote.minimumMet && (
                      <p className="mt-1 font-semibold">
                        {t("delivery.minimumMissing", {
                          amount: (activeDeliveryQuote.minimumOrder - activeDeliveryQuote.subtotal).toFixed(2),
                        })}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </CheckoutSection>

          <CheckoutSection title={t("contact.title")}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t("contact.name")}>
                <input
                  required
                  minLength={2}
                  maxLength={100}
                  autoComplete="name"
                  value={customerName}
                  onChange={(event) => setCustomerName(event.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field label={t("contact.email")}>
                <input
                  required
                  type="email"
                  autoComplete="email"
                  value={customerEmail}
                  onChange={(event) => setCustomerEmail(event.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field label={t("contact.phone")}>
                <input
                  required={paymentMethod === "cash_on_delivery"}
                  type="tel"
                  autoComplete="tel"
                  value={customerPhone}
                  onChange={(event) => setCustomerPhone(event.target.value)}
                  className={inputClass}
                />
              </Field>
            </div>
          </CheckoutSection>

          <CheckoutSection title={t("notes.title")}>
            <label className="block text-sm font-semibold text-char">
              {t("notes.label")}
              <textarea
                value={customerNotes}
                onChange={(event) => setCustomerNotes(event.target.value)}
                maxLength={500}
                rows={4}
                placeholder={t("notes.placeholder")}
                className="mt-2 w-full resize-y rounded-xl border border-border bg-white px-4 py-3 text-char outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-4 focus:ring-primary/10"
              />
              <span className="mt-1 block text-right text-xs text-muted-foreground">
                {customerNotes.length}/500
              </span>
            </label>
          </CheckoutSection>

          <CheckoutSection title={t("payment.title")}>
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              <ChoiceButton
                active={paymentMethod === "online"}
                label={t("payment.card.label")}
                description={t("payment.card.description")}
                icon={CreditCard}
                onClick={() => setPaymentMethod("online")}
              />
              {orderType !== "delivery" && (
                <ChoiceButton
                  active={paymentMethod === "cash_on_site"}
                  label={t("payment.cash.label")}
                  description={
                    orderType === "takeaway"
                      ? t("payment.cash.descriptionTakeaway")
                      : t("payment.cash.descriptionTable")
                  }
                  icon={Banknote}
                  onClick={() => setPaymentMethod("cash_on_site")}
                />
              )}
              {orderType === "delivery" &&
                availability?.cashOnDeliveryEnabled !== false && (
                <ChoiceButton
                  active={paymentMethod === "cash_on_delivery"}
                  label={t("payment.cashOnDelivery.label")}
                  description={t("payment.cashOnDelivery.description")}
                  icon={Banknote}
                  onClick={() => setPaymentMethod("cash_on_delivery")}
                />
                )}
            </div>
          </CheckoutSection>

          {error && (
            <p
              role="alert"
              className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive"
            >
              {error}
            </p>
          )}
        </div>

        <aside className="h-fit rounded-2xl border border-border bg-[#f8fbfd] p-5 shadow-[0_12px_35px_rgba(15,23,42,0.05)] sm:rounded-3xl sm:p-6 lg:sticky lg:top-24">
          <h2 className="text-xl font-black text-char">{t("summary.title")}</h2>
          <div className="mt-5 space-y-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex justify-between gap-4 border-b border-border pb-3 text-sm text-char/80 last:border-0 last:pb-0"
              >
                <span>
                  {item.quantity} × {item.name}
                  {item.excludedIngredients.length > 0 && (
                    <small className="mt-1 block text-xs text-muted-foreground">
                      {t("summary.without")} {item.excludedIngredients.join(", ")}
                    </small>
                  )}
                  {(item.selectedExtras?.length ?? 0) > 0 && (
                    <small className="mt-1 block text-xs text-primary">
                      {t("summary.extra")}: {item.selectedExtras?.map((extra) => extra.name).join(", ")}
                    </small>
                  )}
                </span>
                <span className="shrink-0 font-semibold">€ {((item.price + (item.selectedExtras ?? []).reduce((sum, extra) => sum + extra.price, 0)) * item.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div className="mt-5 flex justify-between border-t border-border pt-5 text-lg font-black text-char">
            <div className="w-full space-y-2">
              {orderType === "delivery" && activeDeliveryQuote && (
                <div className="flex justify-between text-sm font-medium text-muted-foreground">
                  <span>{t("summary.deliveryFee")}</span>
                  <span>€ {activeDeliveryQuote.deliveryFee.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>{t("summary.total")}</span>
                <span className="text-primary">€ {total.toFixed(2)}</span>
              </div>
            </div>
          </div>
          <button
            type="submit"
            disabled={
              busy ||
              availability?.acceptingOrders === false ||
              (orderType === "delivery" &&
                (!activeDeliveryQuote || !activeDeliveryQuote.minimumMet))
            }
            className="mt-6 h-12 w-full rounded-full bg-primary font-black text-white shadow-[0_10px_24px_rgba(11,116,209,0.22)] transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy
              ? t("summary.creatingOrder")
              : stripeStep
                ? t("summary.continuePayment")
                : paymentMethod === "online"
                  ? t("summary.continueToPayment")
                  : t("summary.placeOrder")}
          </button>
          <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
            <LockKeyhole className="size-3.5" aria-hidden="true" />
            {t("summary.securePayment")}
          </p>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            {t("summary.priceDisclaimer")}
          </p>
        </aside>
      </form>

      {stripeStep && paymentOpen && (
        <StripePaymentStep
          publishableKey={stripePublishableKey}
          clientSecret={stripeStep.clientSecret}
          orderNumber={stripeStep.orderNumber}
          trackingToken={stripeStep.trackingToken}
          onCancel={() => setPaymentOpen(false)}
          onComplete={() => {
            clearCart();
            router.push(
              `/orders/track/${encodeURIComponent(stripeStep.trackingToken)}`,
            );
          }}
        />
      )}
    </>
  );
}

function CheckoutSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-white p-4 shadow-[0_8px_28px_rgba(15,23,42,0.04)] sm:rounded-3xl sm:p-6">
      <h2 className="mb-3 text-lg font-black text-char sm:mb-4 sm:text-xl">{title}</h2>
      {children}
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="text-sm font-semibold text-char">
      {label}
      {children}
    </label>
  );
}

function ChoiceButton({
  active,
  label,
  description,
  icon: Icon,
  onClick,
}: {
  active: boolean;
  label: string;
  description: string;
  icon: typeof ShoppingBag;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex min-h-20 flex-col items-center justify-center gap-2 rounded-xl border p-2 text-center transition sm:min-h-24 sm:flex-row sm:justify-start sm:gap-4 sm:rounded-2xl sm:p-4 sm:text-left ${
        active
          ? "border-primary bg-secondary text-char ring-2 ring-primary/10"
          : "border-border bg-white text-char/70 hover:border-primary/40 hover:bg-secondary/40"
      }`}
    >
      <Icon className="size-5 shrink-0 sm:size-6" />
      <span>
        <span className="block text-sm font-black sm:text-base">{label}</span>
        <span className="mt-1 hidden text-xs opacity-70 sm:block">{description}</span>
      </span>
    </button>
  );
}

const inputClass =
  "mt-1.5 h-11 w-full rounded-xl border border-border bg-white px-3 text-char outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 sm:mt-2 sm:h-12 sm:px-4";
