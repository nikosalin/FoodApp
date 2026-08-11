"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  ExternalLink,
  PlugZap,
  RefreshCw,
  ShoppingBag,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type {
  MarketplaceDashboardData,
  MarketplaceProvider,
} from "../types";

const providerStyles: Record<MarketplaceProvider, string> = {
  wolt: "bg-cyan-500",
  uber_eats: "bg-emerald-600",
  lieferando: "bg-orange-600",
};

export function MarketplaceChannels() {
  const [data, setData] = useState<MarketplaceDashboardData>();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [mutationKey, setMutationKey] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/channels", { cache: "no-store" });
      const body = (await response.json()) as MarketplaceDashboardData & { error?: string };
      if (!response.ok) throw new Error(body.error ?? "Unable to load channels");
      setData(body);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to load channels");
    } finally {
      setLoading(false);
    }
  }, []);

  async function mutate(path: string, body: object, key: string) {
    setMutationKey(key);
    setError("");
    try {
      const response = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = (await response.json()) as { message?: string; error?: string };
      if (!response.ok) throw new Error(result.message ?? result.error ?? "Action failed");
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Action failed");
    } finally {
      setMutationKey("");
    }
  }

  useEffect(() => {
    let active = true;
    fetch("/api/admin/channels", { cache: "no-store" })
      .then(async (response) => {
        const body = (await response.json()) as MarketplaceDashboardData & { error?: string };
        if (!response.ok) throw new Error(body.error ?? "Unable to load channels");
        if (active) setData(body);
      })
      .catch((reason: unknown) => {
        if (active) {
          setError(reason instanceof Error ? reason.message : "Unable to load channels");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="space-y-8">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-700">
            Marketplace hub
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight">Delivery channels</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
            One operational view for Wolt, Uber Eats and Lieferando. Marketplace
            payments remain managed and settled by each provider.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="flex items-center justify-center gap-2 rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm font-bold text-stone-700 hover:bg-stone-50 disabled:opacity-50"
        >
          <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </header>

      {error && <Notice tone="error">{error}</Notice>}
      {data?.warning && <Notice tone="warning">{data.warning}</Notice>}

      <section className="grid gap-4 lg:grid-cols-3">
        {(data?.providers ?? []).map((provider) => {
          const connection = data?.connections.find(
            (candidate) => candidate.provider === provider.provider,
          );
          const healthy = provider.configured && Boolean(connection);
          return (
            <article key={provider.provider} className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
              <div className={`h-2 ${providerStyles[provider.provider]}`} />
              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-black">{provider.label}</h2>
                    <p className="mt-1 text-xs font-bold uppercase tracking-wide text-stone-400">
                      {provider.mode}
                    </p>
                  </div>
                  <StatusBadge ready={healthy} configured={provider.configured} />
                </div>

                <ul className="mt-5 flex flex-wrap gap-2">
                  {provider.capabilities.map((capability) => (
                    <li key={capability} className="rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-600">
                      {capability}
                    </li>
                  ))}
                </ul>

                <div className="mt-5 space-y-2 border-t border-stone-100 pt-4 text-sm">
                  <Row label="Credentials" value={provider.configured ? "Configured" : `${provider.missingVariables.length} missing`} />
                  <Row label="Store mapping" value={connection?.display_name ?? "Not connected"} />
                  <Row label="Last event" value={connection?.last_event_at ? formatDate(connection.last_event_at) : "Never"} />
                </div>

                <code className="mt-4 block overflow-x-auto rounded-xl bg-stone-950 p-3 text-xs text-stone-300">
                  {provider.webhookPath}
                </code>
                {connection && (
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={Boolean(mutationKey) || !provider.configured}
                      onClick={() => void mutate(`/api/admin/channels/connections/${connection.id}/availability`, { online: true }, `online-${connection.id}`)}
                      className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-40"
                    >
                      Set online
                    </button>
                    <button
                      type="button"
                      disabled={Boolean(mutationKey) || !provider.configured}
                      onClick={() => void mutate(`/api/admin/channels/connections/${connection.id}/availability`, { online: false }, `offline-${connection.id}`)}
                      className="rounded-lg border border-stone-300 px-3 py-2 text-xs font-bold disabled:opacity-40"
                    >
                      Set offline
                    </button>
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </section>

      <section className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-stone-200 px-5 py-4">
          <div>
            <h2 className="font-black">Unified marketplace orders</h2>
            <p className="mt-1 text-xs text-stone-500">Latest 50 externally managed orders</p>
          </div>
          <ShoppingBag className="size-5 text-stone-400" />
        </div>
        {data?.orders.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
                <tr>
                  <th className="px-5 py-3">Channel</th>
                  <th className="px-5 py-3">Order</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Fulfillment</th>
                  <th className="px-5 py-3">Placed</th>
                  <th className="px-5 py-3 text-right">Total</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {data.orders.map((order) => (
                  <tr key={order.id} className="hover:bg-stone-50">
                    <td className="px-5 py-4 font-bold">{providerLabel(order.provider)}</td>
                    <td className="px-5 py-4">{order.display_order_id ?? order.external_order_id}</td>
                    <td className="px-5 py-4"><OrderStatus value={order.status} /></td>
                    <td className="px-5 py-4 capitalize text-stone-600">{order.fulfillment_type.replace("_", " ")}</td>
                    <td className="px-5 py-4 text-stone-600">{formatDate(order.placed_at)}</td>
                    <td className="px-5 py-4 text-right font-black">{formatMoney(order.total_minor, order.currency)}</td>
                    <td className="px-5 py-4">
                      <OrderActions
                        order={order}
                        disabled={Boolean(mutationKey)}
                        mutate={mutate}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid min-h-56 place-items-center p-8 text-center">
            <div>
              <PlugZap className="mx-auto size-9 text-stone-300" />
              <p className="mt-3 font-bold text-stone-700">No marketplace orders yet</p>
              <p className="mt-1 text-sm text-stone-500">Connect a sandbox store to begin receiving signed events.</p>
            </div>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-blue-200 bg-blue-50 p-5 text-sm text-blue-950">
        <div className="flex gap-3">
          <ExternalLink className="mt-0.5 size-5 shrink-0" />
          <div>
            <p className="font-black">Safe activation sequence</p>
            <p className="mt-1 leading-6 text-blue-900/75">
              Configure sandbox credentials, apply the database migration, create the
              store mapping, verify webhook signatures, and complete provider test cases
              before enabling any production connection.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function OrderActions({
  order,
  disabled,
  mutate,
}: {
  order: MarketplaceDashboardData["orders"][number];
  disabled: boolean;
  mutate: (path: string, body: object, key: string) => Promise<void>;
}) {
  const path = `/api/admin/channels/orders/${order.id}/action`;
  if (order.status === "received") {
    return (
      <div className="flex justify-end gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => void mutate(path, { type: "accept", preparationMinutes: 20 }, `accept-${order.id}`)}
          className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-40"
        >
          Accept · 20 min
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            const reason = window.prompt("Customer-friendly rejection reason");
            if (reason) void mutate(path, { type: "reject", reason }, `reject-${order.id}`);
          }}
          className="rounded-lg bg-red-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-40"
        >
          Reject
        </button>
      </div>
    );
  }
  if ((order.status === "accepted" || order.status === "preparing") && order.provider !== "lieferando") {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => void mutate(path, { type: "ready" }, `ready-${order.id}`)}
        className="ml-auto block rounded-lg bg-blue-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-40"
      >
        Mark ready
      </button>
    );
  }
  return <span className="block text-right text-xs text-stone-400">No action</span>;
}

function StatusBadge({ ready, configured }: { ready: boolean; configured: boolean }) {
  const Icon = ready ? CheckCircle2 : configured ? Clock3 : AlertTriangle;
  const label = ready ? "Connected" : configured ? "Mapping needed" : "Setup needed";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${ready ? "bg-emerald-50 text-emerald-700" : configured ? "bg-amber-50 text-amber-700" : "bg-stone-100 text-stone-600"}`}>
      <Icon className="size-3.5" /> {label}
    </span>
  );
}

function OrderStatus({ value }: { value: string }) {
  return <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold capitalize text-amber-800">{value.replace("_", " ")}</span>;
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between gap-4"><span className="text-stone-500">{label}</span><span className="text-right font-semibold text-stone-800">{value}</span></div>;
}

function Notice({ children, tone }: { children: React.ReactNode; tone: "error" | "warning" }) {
  return <div role="alert" className={`rounded-xl border p-4 text-sm ${tone === "error" ? "border-red-200 bg-red-50 text-red-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}>{children}</div>;
}

function providerLabel(provider: MarketplaceProvider) {
  if (provider === "uber_eats") return "Uber Eats";
  if (provider === "lieferando") return "Lieferando";
  return "Wolt";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("de-DE", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

function formatMoney(amountMinor: number, currency: string) {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency }).format(amountMinor / 100);
}
