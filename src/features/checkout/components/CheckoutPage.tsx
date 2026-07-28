"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { FormEvent } from "react";
import { CreditCard, ShoppingBag, Utensils } from "lucide-react";
import { useCartStore } from "@/features/cart/store/useCartStore";
import { getCartTotal } from "@/features/cart/lib/selectors";
import { StripePaymentStep } from "@/features/payments/components/StripePaymentStep";

type OrderType = "takeaway" | "table";
type PaymentMethod = "online" | "cash_on_site";

type StripeStep = {
  clientSecret: string;
  orderNumber: string;
  trackingToken: string;
};

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
  const [orderType, setOrderType] = useState<OrderType>("takeaway");
  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("online");
  const [tableNumber, setTableNumber] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [stripeStep, setStripeStep] = useState<StripeStep>();
  const [paymentOpen, setPaymentOpen] = useState(false);

  const total = getCartTotal(items);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !restaurantId || items.length === 0) return;
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
          customerName,
          customerEmail,
          customerPhone,
          preferredChannel: "email",
          paymentMethod,
          onlinePaymentProvider:
            paymentMethod === "online" ? "stripe" : undefined,
          items: items.map((item) => ({
            menuItemId: item.id,
            quantity: item.quantity,
          })),
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
        throw new Error(
          body.message ?? body.error ?? "The order could not be created.",
        );
      }

      if (paymentMethod === "online") {
        if (!stripePublishableKey || !body.payment?.clientSecret) {
          throw new Error("Stripe is not configured for this restaurant.");
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
        reason instanceof Error ? reason.message : "The order failed.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (items.length === 0) {
    return (
      <section className="mx-auto max-w-2xl px-4 py-24 text-center">
        <h1 className="text-3xl font-black text-pita">Your cart is empty</h1>
        <p className="mt-3 text-pita/70">
          Add something from the menu before checking out.
        </p>
        <Link
          href="/menu"
          className="mt-6 inline-flex rounded-full bg-lemon px-6 py-3 font-bold text-char"
        >
          Browse the menu
        </Link>
      </section>
    );
  }

  return (
    <>
      <form
        onSubmit={submit}
        className="mx-auto grid max-w-5xl gap-8 px-4 py-12 lg:grid-cols-[1fr_22rem]"
      >
        <div className="space-y-6">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-lemon">
              Checkout
            </p>
            <h1 className="mt-2 text-4xl font-black text-pita">
              Complete your order
            </h1>
          </div>

          <CheckoutSection title="Order type">
            <div className="grid gap-3 sm:grid-cols-2">
              <ChoiceButton
                active={orderType === "takeaway"}
                label="Takeaway"
                description="Pick up at the restaurant"
                icon={ShoppingBag}
                onClick={() => setOrderType("takeaway")}
              />
              <ChoiceButton
                active={orderType === "table"}
                label="At the restaurant"
                description="Order for your table"
                icon={Utensils}
                onClick={() => setOrderType("table")}
              />
            </div>
            {orderType === "table" && (
              <label className="mt-4 block text-sm font-semibold text-pita">
                Table number
                <input
                  required
                  value={tableNumber}
                  onChange={(event) => setTableNumber(event.target.value)}
                  maxLength={12}
                  className="mt-2 h-12 w-full rounded-xl border border-pita/20 bg-char px-4 text-pita outline-none focus:border-lemon"
                />
              </label>
            )}
          </CheckoutSection>

          <CheckoutSection title="Contact details">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Name">
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
              <Field label="Email">
                <input
                  required
                  type="email"
                  autoComplete="email"
                  value={customerEmail}
                  onChange={(event) => setCustomerEmail(event.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field label="Phone (optional)">
                <input
                  type="tel"
                  autoComplete="tel"
                  value={customerPhone}
                  onChange={(event) => setCustomerPhone(event.target.value)}
                  className={inputClass}
                />
              </Field>
            </div>
          </CheckoutSection>

          <CheckoutSection title="Payment">
            <div className="grid gap-3 sm:grid-cols-2">
              <ChoiceButton
                active={paymentMethod === "online"}
                label="Card"
                description="Authorize now, capture on acceptance"
                icon={CreditCard}
                onClick={() => setPaymentMethod("online")}
              />
              <ChoiceButton
                active={paymentMethod === "cash_on_site"}
                label="Cash"
                description={
                  orderType === "takeaway"
                    ? "Pay when you pick up"
                    : "Pay at your table"
                }
                icon={ShoppingBag}
                onClick={() => setPaymentMethod("cash_on_site")}
              />
            </div>
          </CheckoutSection>

          {error && (
            <p
              role="alert"
              className="rounded-2xl border border-tomato/30 bg-tomato/10 p-4 text-sm text-pita"
            >
              {error}
            </p>
          )}
        </div>

        <aside className="h-fit rounded-3xl border border-pita/10 bg-pita/5 p-6 lg:sticky lg:top-24">
          <h2 className="text-xl font-black text-pita">Order summary</h2>
          <div className="mt-5 space-y-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex justify-between gap-4 text-sm text-pita/80"
              >
                <span>
                  {item.quantity} × {item.name}
                </span>
                <span>€ {(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div className="mt-5 flex justify-between border-t border-pita/20 pt-5 text-lg font-black text-pita">
            <span>Total</span>
            <span className="text-lemon">€ {total.toFixed(2)}</span>
          </div>
          <button
            type="submit"
            disabled={busy}
            className="mt-6 h-12 w-full rounded-full bg-chili font-black text-pita transition hover:bg-chili/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy
              ? "Creating order…"
              : stripeStep
                ? "Continue payment"
                : paymentMethod === "online"
                  ? "Continue to secure payment"
                  : "Place order"}
          </button>
          <p className="mt-3 text-center text-xs text-pita/60">
            Menu prices are verified again by the server.
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
    <section className="rounded-3xl border border-pita/10 bg-pita/5 p-6">
      <h2 className="mb-4 text-xl font-black text-pita">{title}</h2>
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
    <label className="text-sm font-semibold text-pita">
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
      className={`flex min-h-24 items-center gap-4 rounded-2xl border p-4 text-left transition ${
        active
          ? "border-lemon bg-lemon/10 text-pita"
          : "border-pita/15 text-pita/70 hover:border-pita/30"
      }`}
    >
      <Icon className="size-6 shrink-0" />
      <span>
        <span className="block font-black">{label}</span>
        <span className="mt-1 block text-xs opacity-70">{description}</span>
      </span>
    </button>
  );
}

const inputClass =
  "mt-2 h-12 w-full rounded-xl border border-pita/20 bg-char px-4 text-pita outline-none focus:border-lemon";
