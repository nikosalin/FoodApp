"use client";

import { useEffect, useState } from "react";
import type { OrderItem, OrderStatus } from "@/features/admin/types";

type TrackedOrder = {
  orderNumber: string;
  status: OrderStatus;
  orderType: "table" | "takeaway" | "delivery";
  estimatedFulfillmentAt?: string;
  customerNotes?: string;
  items: OrderItem[];
  total: number;
  rejectionReason?: string;
};

const statusLabels: Record<OrderStatus, string> = {
  pending: "Beim Restaurant eingegangen",
  accepted: "Vom Restaurant angenommen",
  preparing: "Wird zubereitet",
  ready: "Abhol- oder lieferbereit",
  completed: "Abgeschlossen",
  cancelled: "Storniert",
  rejected: "Vom Restaurant abgelehnt",
};

export function OrderTracking({ trackingToken }: { trackingToken: string }) {
  const [order, setOrder] = useState<TrackedOrder>();
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const response = await fetch(
        `/api/orders/track/${encodeURIComponent(trackingToken)}`,
        { cache: "no-store" },
      );
      if (!active) return;
      if (!response.ok) {
        setUnavailable(true);
        return;
      }
      const body = (await response.json()) as { order: TrackedOrder };
      setOrder(body.order);
      setUnavailable(false);
    };
    void load();
    const interval = window.setInterval(load, 15_000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [trackingToken]);

  if (unavailable) {
    return (
      <TrackingShell>
        <h1 className="text-2xl font-black">Bestellung nicht gefunden</h1>
        <p className="mt-3 text-stone-600">
          Der Link ist ungültig oder abgelaufen.
        </p>
      </TrackingShell>
    );
  }

  if (!order) {
    return (
      <TrackingShell>
        <p className="text-stone-600">Bestellstatus wird geladen …</p>
      </TrackingShell>
    );
  }

  return (
    <TrackingShell>
      <p className="text-sm font-semibold uppercase tracking-widest text-amber-700">
        Bestellung {order.orderNumber}
      </p>
      <h1 className="mt-2 text-3xl font-black">{statusLabels[order.status]}</h1>
      <p className="mt-2 text-sm text-stone-500">
        Diese Seite wird automatisch aktualisiert.
      </p>
      {order.estimatedFulfillmentAt && (
        <p className="mt-4 rounded-xl bg-amber-50 p-4 font-bold text-amber-900">
          Voraussichtliche{" "}
          {order.orderType === "delivery" ? "Lieferung" : "Abholzeit"}:{" "}
          {new Intl.DateTimeFormat("de-DE", {
            hour: "2-digit",
            minute: "2-digit",
          }).format(new Date(order.estimatedFulfillmentAt))}
        </p>
      )}
      <ul className="mt-6 divide-y divide-stone-200 rounded-xl border border-stone-200 px-4">
        {order.items.map((item, index) => (
          <li
            key={`${item.menuItemId ?? item.name}-${index}`}
            className="flex justify-between gap-4 py-3"
          >
            <span>
              {item.quantity} × {item.name}
            </span>
            <strong>
              {(item.quantity * item.unitPrice).toLocaleString("de-DE", {
                style: "currency",
                currency: "EUR",
              })}
            </strong>
          </li>
        ))}
      </ul>
      {order.customerNotes && (
        <div className="mt-4 whitespace-pre-line rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
          <strong className="block">Anpassungen</strong>
          {order.customerNotes}
        </div>
      )}
      <p className="mt-4 text-right text-xl font-black">
        {order.total.toLocaleString("de-DE", {
          style: "currency",
          currency: "EUR",
        })}
      </p>
      {order.rejectionReason && (
        <p className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-800">
          {order.rejectionReason}
        </p>
      )}
    </TrackingShell>
  );
}

function TrackingShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="grid min-h-screen place-items-center bg-stone-100 p-4">
      <section className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-sm sm:p-8">
        {children}
      </section>
    </main>
  );
}
