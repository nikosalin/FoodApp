"use client";

import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { useMemo, useState } from "react";

export function StripePaymentStep({
  publishableKey,
  clientSecret,
  orderNumber,
  trackingToken,
  onCancel,
  onComplete,
}: {
  publishableKey: string;
  clientSecret: string;
  orderNumber: string;
  trackingToken: string;
  onCancel: () => void;
  onComplete: () => void;
}) {
  const stripe = useMemo(() => loadStripe(publishableKey), [publishableKey]);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 p-4">
      <div className="mx-auto my-8 max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
        <p className="text-xs font-black uppercase tracking-widest text-amber-700">
          Bestellung {orderNumber}
        </p>
        <h2 className="mt-2 text-2xl font-black">Sicher online bezahlen</h2>
        <p className="mt-2 text-sm text-stone-500">
          Der Betrag wird zunächst autorisiert und erst abgebucht, wenn das
          Restaurant die Bestellung annimmt.
        </p>
        <Elements
          stripe={stripe}
          options={{
            clientSecret,
            appearance: { theme: "stripe" },
            locale: "de",
          }}
        >
          <PaymentForm
            trackingToken={trackingToken}
            onCancel={onCancel}
            onComplete={onComplete}
          />
        </Elements>
      </div>
    </div>
  );
}

function PaymentForm({
  trackingToken,
  onCancel,
  onComplete,
}: {
  trackingToken: string;
  onCancel: () => void;
  onComplete: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [complete, setComplete] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!stripe || !elements) return;
    setBusy(true);
    setError("");
    const result = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
      confirmParams: {
        return_url: `${window.location.origin}/orders/track/${trackingToken}`,
      },
    });
    if (result.error) {
      setError(result.error.message ?? "Die Zahlung konnte nicht bestätigt werden.");
      setBusy(false);
      return;
    }
    setComplete(true);
    setBusy(false);
  }

  if (complete) {
    return (
      <div className="mt-6 rounded-2xl bg-emerald-50 p-5 text-emerald-900">
        <p className="font-black">Zahlung autorisiert</p>
        <p className="mt-1 text-sm">
          Das Restaurant kann die Bestellung jetzt annehmen.
        </p>
        <button
          type="button"
          onClick={onComplete}
          className="mt-4 rounded-xl bg-emerald-800 px-4 py-2 font-bold text-white"
        >
          Fertig
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mt-6">
      <PaymentElement />
      {error && (
        <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}
      <div className="mt-5 flex gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={onCancel}
          className="h-12 flex-1 rounded-xl border border-stone-300 font-bold"
        >
          Abbrechen
        </button>
        <button
          type="submit"
          disabled={!stripe || busy}
          className="h-12 flex-1 rounded-xl bg-stone-950 font-bold text-white disabled:opacity-50"
        >
          {busy ? "Wird bestätigt…" : "Zahlung bestätigen"}
        </button>
      </div>
    </form>
  );
}
