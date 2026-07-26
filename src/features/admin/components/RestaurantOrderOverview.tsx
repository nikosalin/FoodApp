"use client";

import {
  ArrowLeft,
  Banknote,
  CheckCircle2,
  ChefHat,
  Clock3,
  Euro,
  History,
  Minus,
  Package,
  Pencil,
  Play,
  Plus,
  ReceiptText,
  RotateCcw,
  Search,
  ShoppingBag,
  Store,
  User,
  XCircle,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { subscribeToAdminState } from "../lib/admin-store";
import {
  acceptOrder,
  createAdminOrder,
  deleteAdminOrder,
  declineOrder,
  editAdminOrder,
  getDeletedOrders,
  getOrderHistory,
  getRestaurantOrders,
  markCashCollected,
  refundOrder,
  restoreDeletedOrder,
  subscribeToRestaurantOrders,
  updateOrderStatus,
} from "@/features/orders/lib/order-api";
import type {
  DeletedRestaurantOrder,
  OrderInput,
  OrderHistoryEvent,
  OrderStatus,
  Restaurant,
  RestaurantOrder,
} from "../types";
import {
  AdminBadge,
  AdminCard,
  AdminModal,
  fieldClassName,
  formatAdminCurrency,
  formatAdminDate,
  primaryButtonClassName,
  secondaryButtonClassName,
} from "./AdminUi";
import { RestaurantQrCard } from "./RestaurantQrCard";
import { getPublicMenu } from "@/features/menu/data/menu";
import { RestaurantAvailabilityCard } from "@/features/restaurants/components/RestaurantAvailabilityCard";

const closedStatuses: OrderStatus[] = ["completed", "cancelled", "rejected"];

function isSameLocalDay(value: string, day: Date) {
  const date = new Date(value);
  return (
    date.getFullYear() === day.getFullYear() &&
    date.getMonth() === day.getMonth() &&
    date.getDate() === day.getDate()
  );
}

export function RestaurantOrderOverview({
  restaurantId,
}: {
  restaurantId: string;
}) {
  const [restaurant, setRestaurant] = useState<Restaurant | null>();
  const [orders, setOrders] = useState<RestaurantOrder[]>([]);
  const [view, setView] = useState<"pending" | "closed" | "deleted">("pending");
  const [deletedOrders, setDeletedOrders] = useState<DeletedRestaurantOrder[]>([]);
  const [deletedLoaded, setDeletedLoaded] = useState(false);
  const [historyTarget, setHistoryTarget] = useState<RestaurantOrder | null>(null);
  const [historyEvents, setHistoryEvents] = useState<OrderHistoryEvent[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [archiveSearch, setArchiveSearch] = useState("");
  const [archiveStatus, setArchiveStatus] = useState<"all" | OrderStatus>("all");
  const [archiveFrom, setArchiveFrom] = useState("");
  const [archiveTo, setArchiveTo] = useState("");
  const [archivePayment, setArchivePayment] = useState<
    "all" | NonNullable<RestaurantOrder["paymentMethod"]>
  >("all");
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [error, setError] = useState("");
  const [busyOrderId, setBusyOrderId] = useState<string>();
  const [declineTarget, setDeclineTarget] = useState<RestaurantOrder | null>(
    null,
  );
  const [editorOpen, setEditorOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<RestaurantOrder | null>(null);

  useEffect(
    () =>
      subscribeToAdminState((state) => {
        setRestaurant(
          state.restaurants.find((item) => item.id === restaurantId) ?? null,
        );
      }),
    [restaurantId],
  );

  useEffect(() => {
    let active = true;
    const loadOrders = () => {
      getRestaurantOrders(restaurantId)
        .then((result) => {
          if (active) {
            setOrders(result);
            setLoadingOrders(false);
          }
        })
        .catch((reason: unknown) => {
          if (active) {
            setError(
              reason instanceof Error ? reason.message : "Unable to load orders",
            );
            setLoadingOrders(false);
          }
        });
    };
    loadOrders();
    const unsubscribe = subscribeToRestaurantOrders(restaurantId, loadOrders);
    return () => {
      active = false;
      unsubscribe();
    };
  }, [restaurantId]);

  useEffect(() => {
    if (view !== "deleted" || deletedLoaded) return;
    getDeletedOrders(restaurantId)
      .then((result) => {
        setDeletedOrders(result);
        setDeletedLoaded(true);
      })
      .catch((reason: unknown) => {
        setError(
          reason instanceof Error ? reason.message : "Unable to load deleted orders",
        );
      });
  }, [deletedLoaded, restaurantId, view]);

  const openHistory = async (order: RestaurantOrder) => {
    setHistoryTarget(order);
    setHistoryEvents([]);
    setHistoryLoading(true);
    try {
      setHistoryEvents(await getOrderHistory(restaurantId, order.id));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to load history");
      setHistoryTarget(null);
    } finally {
      setHistoryLoading(false);
    }
  };

  const runOrderMutation = async (
    orderId: string,
    mutation: () => Promise<RestaurantOrder>,
  ) => {
    setError("");
    setBusyOrderId(orderId);
    try {
      const updated = await mutation();
      setOrders((current) =>
        current.map((order) => (order.id === updated.id ? updated : order)),
      );
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Order update failed");
    } finally {
      setBusyOrderId(undefined);
    }
  };

  const summary = useMemo(() => {
    const today = new Date();
    const pending = orders.filter(
      (order) => !closedStatuses.includes(order.status),
    );
    const closed = orders.filter((order) =>
      closedStatuses.includes(order.status),
    );
    const closedToday = closed.filter(
      (order) =>
        order.closedAt &&
        isSameLocalDay(order.closedAt, today) &&
        order.status === "completed",
    );
    return {
      pending,
      closed,
      closedToday,
      revenueToday: closedToday.reduce((sum, order) => sum + order.total, 0),
    };
  }, [orders]);

  const visibleOrders = useMemo(() => {
    const source = view === "pending" ? summary.pending : summary.closed;
    if (view !== "closed") return source;
    const query = archiveSearch.trim().toLowerCase();
    return source.filter((order) => {
      const matchesSearch =
        !query ||
        order.orderNumber.toLowerCase().includes(query) ||
        order.customerName.toLowerCase().includes(query) ||
        order.customerEmail?.toLowerCase().includes(query) ||
        order.customerPhone?.toLowerCase().includes(query);
      const orderDate = new Date(order.closedAt ?? order.createdAt);
      const matchesFrom =
        !archiveFrom || orderDate >= new Date(`${archiveFrom}T00:00:00`);
      const matchesTo =
        !archiveTo || orderDate <= new Date(`${archiveTo}T23:59:59.999`);
      return (
        matchesSearch &&
        matchesFrom &&
        matchesTo &&
        (archiveStatus === "all" || order.status === archiveStatus) &&
        (archivePayment === "all" || order.paymentMethod === archivePayment)
      );
    });
  }, [
    archivePayment,
    archiveFrom,
    archiveSearch,
    archiveStatus,
    archiveTo,
    summary.closed,
    summary.pending,
    view,
  ]);

  if (restaurant === undefined) {
    return <p className="text-sm text-stone-500">Loading restaurant orders…</p>;
  }

  if (restaurant === null) {
    return (
      <AdminCard className="py-14 text-center">
        <Store className="mx-auto size-14 text-stone-300" />
        <h1 className="mt-4 text-xl font-bold">Restaurant not found</h1>
        <Link
          href="/admin/restaurants"
          className="mt-4 inline-flex items-center gap-2 font-semibold text-amber-700"
        >
          <ArrowLeft className="size-4" />
          Return to restaurants
        </Link>
      </AdminCard>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/restaurants"
          className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-stone-500 hover:text-stone-950"
        >
          <ArrowLeft className="size-4" />
          All restaurants
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-amber-700">
              Restaurant overview
            </p>
            <h1 className="mt-1 text-3xl font-black">{restaurant.name}</h1>
            <p className="mt-2 text-stone-500">
              Today’s order flow and completed sales.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <AdminBadge
              tone={
                restaurant.status === "active"
                  ? "success"
                  : restaurant.status === "blocked"
                    ? "danger"
                    : "warning"
              }
            >
              {restaurant.status}
            </AdminBadge>
            <button
              type="button"
              className={primaryButtonClassName}
              onClick={() => {
                setEditTarget(null);
                setEditorOpen(true);
              }}
            >
              <Plus className="size-4" />
              New order
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Pending orders"
          value={summary.pending.length.toString()}
          icon={Clock3}
          iconClassName="bg-amber-100 text-amber-700"
        />
        <SummaryCard
          label="Closed orders"
          value={summary.closed.length.toString()}
          icon={CheckCircle2}
          iconClassName="bg-emerald-100 text-emerald-700"
        />
        <SummaryCard
          label="Closed today"
          value={summary.closedToday.length.toString()}
          icon={ReceiptText}
          iconClassName="bg-sky-100 text-sky-700"
        />
        <SummaryCard
          label="Today's revenue"
          value={formatAdminCurrency(summary.revenueToday)}
          icon={Euro}
          iconClassName="bg-violet-100 text-violet-700"
        />
      </div>

      <RestaurantAvailabilityCard restaurantId={restaurant.id} />

      <RestaurantQrCard restaurant={restaurant} />

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="flex gap-2 border-b border-stone-200">
        <OrderTab
          active={view === "pending"}
          onClick={() => setView("pending")}
          label={`Pending (${summary.pending.length})`}
        />
        <OrderTab
          active={view === "closed"}
          onClick={() => setView("closed")}
          label={`Closed (${summary.closed.length})`}
        />
        <OrderTab
          active={view === "deleted"}
          onClick={() => setView("deleted")}
          label={`Deleted${deletedLoaded ? ` (${deletedOrders.length})` : ""}`}
        />
      </div>

      {view === "closed" && (
        <AdminCard>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_12rem_13rem_10rem_10rem]">
            <label className="relative">
              <Search className="absolute left-3 top-3.5 size-4 text-stone-400" />
              <input
                className={`${fieldClassName} pl-9`}
                value={archiveSearch}
                onChange={(event) => setArchiveSearch(event.target.value)}
                placeholder="Order, customer, email or phone"
                aria-label="Search closed orders"
              />
            </label>
            <select
              className={fieldClassName}
              value={archiveStatus}
              onChange={(event) =>
                setArchiveStatus(event.target.value as "all" | OrderStatus)
              }
              aria-label="Filter by order status"
            >
              <option value="all">All statuses</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="rejected">Rejected</option>
            </select>
            <select
              className={fieldClassName}
              value={archivePayment}
              onChange={(event) =>
                setArchivePayment(
                  event.target.value as typeof archivePayment,
                )
              }
              aria-label="Filter by payment method"
            >
              <option value="all">All payment methods</option>
              <option value="online">Online card</option>
              <option value="cash_on_site">Cash on site</option>
              <option value="cash_on_delivery">Cash on delivery</option>
              <option value="external_card">External terminal</option>
            </select>
            <label>
              <span className="sr-only">Closed from date</span>
              <input
                type="date"
                className={fieldClassName}
                value={archiveFrom}
                onChange={(event) => setArchiveFrom(event.target.value)}
                aria-label="Closed from date"
              />
            </label>
            <label>
              <span className="sr-only">Closed through date</span>
              <input
                type="date"
                className={fieldClassName}
                value={archiveTo}
                min={archiveFrom || undefined}
                onChange={(event) => setArchiveTo(event.target.value)}
                aria-label="Closed through date"
              />
            </label>
          </div>
        </AdminCard>
      )}

      {view === "deleted" ? (
        !deletedLoaded ? (
          <AdminCard className="py-14 text-center">
            <p className="text-stone-500">Loading deleted orders…</p>
          </AdminCard>
        ) : deletedOrders.length === 0 ? (
          <AdminCard className="py-14 text-center">
            <Trash2 className="mx-auto size-14 text-stone-300" />
            <h2 className="mt-4 text-xl font-bold">No deleted orders</h2>
          </AdminCard>
        ) : (
          <div className="grid gap-4">
            {deletedOrders.map((order) => (
              <DeletedOrderCard
                key={order.id}
                order={order}
                busy={busyOrderId === order.id}
                onHistory={() => void openHistory(order)}
                onRestore={async () => {
                  setBusyOrderId(order.id);
                  setError("");
                  try {
                    const restored = await restoreDeletedOrder(
                      restaurantId,
                      order.id,
                    );
                    setDeletedOrders((current) =>
                      current.filter((item) => item.id !== order.id),
                    );
                    setOrders((current) => [restored, ...current]);
                  } catch (reason) {
                    setError(
                      reason instanceof Error
                        ? reason.message
                        : "Unable to restore order",
                    );
                  } finally {
                    setBusyOrderId(undefined);
                  }
                }}
              />
            ))}
          </div>
        )
      ) : loadingOrders ? (
        <AdminCard className="py-14 text-center">
          <p className="text-stone-500">Loading orders from the API…</p>
        </AdminCard>
      ) : visibleOrders.length === 0 ? (
        <AdminCard className="py-14 text-center">
          <Package className="mx-auto size-14 text-stone-300" />
          <h2 className="mt-4 text-xl font-bold">
            No {view} orders
          </h2>
          <p className="mt-1 text-stone-500">
            Orders in this group will appear here.
          </p>
        </AdminCard>
      ) : (
        <div className="grid gap-4">
          {[...visibleOrders]
            .sort(
              (first, second) =>
                new Date(second.createdAt).getTime() -
                new Date(first.createdAt).getTime(),
            )
            .map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                busy={busyOrderId === order.id}
                onAccept={() =>
                  runOrderMutation(order.id, () =>
                    acceptOrder(restaurantId, order.id),
                  )
                }
                onDecline={() => setDeclineTarget(order)}
                onStatus={(status) =>
                  runOrderMutation(order.id, () =>
                    updateOrderStatus(restaurantId, order.id, status),
                  )
                }
                onEdit={() => {
                  setEditTarget(order);
                  setEditorOpen(true);
                }}
                onDelete={async () => {
                  if (
                    !window.confirm(
                      `Move order #${order.orderNumber} to deleted orders?`,
                    )
                  ) {
                    return;
                  }
                  setBusyOrderId(order.id);
                  try {
                    await deleteAdminOrder(restaurantId, order.id);
                    setOrders((current) =>
                      current.filter((item) => item.id !== order.id),
                    );
                    setDeletedLoaded(false);
                  } catch (reason) {
                    setError(
                      reason instanceof Error
                        ? reason.message
                        : "Unable to delete order",
                    );
                  } finally {
                    setBusyOrderId(undefined);
                  }
                }}
                onRefund={() => {
                  if (!window.confirm(`Refund order #${order.orderNumber}?`)) {
                    return;
                  }
                  void runOrderMutation(order.id, () =>
                    refundOrder(restaurantId, order.id),
                  );
                }}
                onCashCollected={() =>
                  void runOrderMutation(order.id, () =>
                    markCashCollected(restaurantId, order.id),
                  )
                }
                onHistory={() => void openHistory(order)}
              />
            ))}
        </div>
      )}

      {declineTarget && (
        <DeclineOrderModal
          order={declineTarget}
          busy={busyOrderId === declineTarget.id}
          onClose={() => setDeclineTarget(null)}
          onDecline={async (reason) => {
            await runOrderMutation(declineTarget.id, () =>
              declineOrder(restaurantId, declineTarget.id, reason),
            );
            setDeclineTarget(null);
          }}
        />
      )}
      {editorOpen && (
        <OrderEditorModal
          restaurant={restaurant}
          order={editTarget}
          onClose={() => {
            setEditorOpen(false);
            setEditTarget(null);
          }}
          onSave={async (input) => {
            setError("");
            try {
              const saved = editTarget
                ? await editAdminOrder(restaurantId, editTarget.id, input)
                : await createAdminOrder(restaurantId, input);
              setOrders((current) => {
                const exists = current.some((order) => order.id === saved.id);
                return exists
                  ? current.map((order) =>
                      order.id === saved.id ? saved : order,
                    )
                  : [saved, ...current];
              });
              setEditorOpen(false);
              setEditTarget(null);
            } catch (reason) {
              throw reason;
            }
          }}
        />
      )}
      {historyTarget && (
        <OrderHistoryModal
          order={historyTarget}
          events={historyEvents}
          loading={historyLoading}
          onClose={() => setHistoryTarget(null)}
        />
      )}
    </div>
  );
}

function DeletedOrderCard({
  order,
  busy,
  onRestore,
  onHistory,
}: {
  order: DeletedRestaurantOrder;
  busy: boolean;
  onRestore: () => void;
  onHistory: () => void;
}) {
  return (
    <AdminCard>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <Trash2 className="size-5 text-stone-500" />
            <h2 className="text-lg font-black">Order #{order.orderNumber}</h2>
            <AdminBadge>{order.status}</AdminBadge>
          </div>
          <p className="mt-2 text-sm text-stone-500">
            {order.customerName} · {formatAdminCurrency(order.total)}
          </p>
          <p className="mt-1 text-xs text-stone-500">
            Deleted {formatAdminDate(order.deletedAt)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={secondaryButtonClassName}
            onClick={onHistory}
            disabled={busy}
          >
            <History className="size-4" />
            View history
          </button>
          <button
            type="button"
            className={primaryButtonClassName}
            onClick={onRestore}
            disabled={busy}
          >
            <RotateCcw className="size-4" />
            Restore
          </button>
        </div>
      </div>
    </AdminCard>
  );
}

function OrderHistoryModal({
  order,
  events,
  loading,
  onClose,
}: {
  order: RestaurantOrder;
  events: OrderHistoryEvent[];
  loading: boolean;
  onClose: () => void;
}) {
  return (
    <AdminModal title={`History · #${order.orderNumber}`} onClose={onClose}>
      {loading ? (
        <p className="py-8 text-center text-stone-500">Loading history…</p>
      ) : events.length === 0 ? (
        <p className="py-8 text-center text-stone-500">
          No historical events recorded.
        </p>
      ) : (
        <ol className="relative ml-2 border-l border-stone-200">
          {events.map((event) => (
            <li key={event.id} className="relative pb-6 pl-6 last:pb-0">
              <span className="absolute -left-2 top-1.5 size-4 rounded-full border-4 border-white bg-amber-600" />
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-bold">{historyEventLabel(event)}</p>
                <time className="text-xs text-stone-500">
                  {formatAdminDate(event.createdAt)}
                </time>
              </div>
              <p className="mt-1 text-sm text-stone-500">
                {event.actorName ?? "System"}
              </p>
              {event.fromStatus && event.toStatus && (
                <p className="mt-2 text-sm text-stone-700">
                  {event.fromStatus} → <strong>{event.toStatus}</strong>
                </p>
              )}
              {Object.keys(event.details).length > 0 && (
                <dl className="mt-2 grid gap-1 rounded-lg bg-stone-50 p-3 text-xs">
                  {Object.entries(event.details).map(([key, value]) => (
                    <div key={key} className="flex justify-between gap-4">
                      <dt className="text-stone-500">{detailLabel(key)}</dt>
                      <dd className="max-w-64 text-right font-medium">
                        {formatDetailValue(key, value)}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
            </li>
          ))}
        </ol>
      )}
    </AdminModal>
  );
}

function historyEventLabel(event: OrderHistoryEvent) {
  const labels: Record<string, string> = {
    "order.created": "Order created",
    "order.status_changed": "Status changed",
    "order.edited": "Order edited",
    "order.deleted": "Order deleted",
    "order.restored": "Order restored",
    "payment.captured": "Card payment captured",
    "payment.cancelled": "Payment authorization cancelled",
    "payment.refunded": "Payment refunded",
    "payment.cash_collected": "Cash collected",
  };
  return labels[event.eventType] ?? event.eventType.replaceAll("_", " ");
}

function detailLabel(key: string) {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (character) => character.toUpperCase());
}

function formatDetailValue(
  key: string,
  value: string | number | boolean | null,
) {
  if (value === null) return "—";
  if (key.toLowerCase().includes("minor") && typeof value === "number") {
    return formatAdminCurrency(value / 100);
  }
  return String(value);
}

function SummaryCard({
  label,
  value,
  icon: Icon,
  iconClassName,
}: {
  label: string;
  value: string;
  icon: typeof Clock3;
  iconClassName: string;
}) {
  return (
    <AdminCard>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-stone-500">{label}</p>
          <p className="mt-2 text-3xl font-black">{value}</p>
        </div>
        <span
          className={`grid size-11 place-items-center rounded-xl ${iconClassName}`}
        >
          <Icon className="size-5" />
        </span>
      </div>
    </AdminCard>
  );
}

function OrderTab({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`border-b-2 px-4 py-3 text-sm font-bold transition ${
        active
          ? "border-amber-600 text-stone-950"
          : "border-transparent text-stone-500 hover:text-stone-950"
      }`}
    >
      {label}
    </button>
  );
}

function OrderCard({
  order,
  busy,
  onAccept,
  onDecline,
  onStatus,
  onEdit,
  onDelete,
  onRefund,
  onCashCollected,
  onHistory,
}: {
  order: RestaurantOrder;
  busy: boolean;
  onAccept: () => void;
  onDecline: () => void;
  onStatus: (
    status: "preparing" | "ready" | "completed" | "cancelled",
  ) => void;
  onEdit: () => void;
  onDelete: () => void;
  onRefund: () => void;
  onCashCollected: () => void;
  onHistory: () => void;
}) {
  const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const statusTone = closedStatuses.includes(order.status)
    ? order.status === "completed"
      ? "success"
      : "danger"
    : "warning";

  return (
    <AdminCard
      className={
        closedStatuses.includes(order.status)
          ? ""
          : "border-l-4 border-l-amber-500"
      }
    >
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <ShoppingBag className="size-5 text-amber-700" />
            <h2 className="text-lg font-black">Order #{order.orderNumber}</h2>
            <AdminBadge tone={statusTone}>{order.status}</AdminBadge>
          </div>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-stone-500">
            <span className="flex items-center gap-2">
              <Clock3 className="size-4" />
              {formatAdminDate(order.createdAt)}
            </span>
            <span className="flex items-center gap-2">
              <User className="size-4" />
              {order.customerName}
            </span>
            <span>
              {order.orderType}
              {order.tableNumber ? ` · Table ${order.tableNumber}` : ""}
            </span>
            <span>
              {order.paymentMethod === "cash_on_site"
                ? order.orderType === "takeaway"
                  ? "Cash on pickup"
                  : "Cash on site"
                : order.paymentMethod === "external_card"
                  ? "External terminal"
                  : order.paymentMethod === "cash_on_delivery"
                    ? "Cash on delivery"
                  : order.paymentMethod === "online"
                    ? "Online payment"
                    : "Payment not recorded"}
              {order.paymentStatus ? ` · ${order.paymentStatus}` : ""}
            </span>
            {order.deliveryAddress && (
              <span>
                {order.deliveryAddress.street}, {order.deliveryAddress.postalCode}{" "}
                {order.deliveryAddress.city}
              </span>
            )}
          </div>
          <ul className="mt-4 space-y-2 rounded-xl bg-stone-50 p-3 text-sm">
            {order.items.map((item) => (
              <li
                key={item.name}
                className="flex justify-between gap-4 text-stone-600"
              >
                <span>
                  {item.quantity} × {item.name}
                </span>
                <span>{formatAdminCurrency(item.quantity * item.unitPrice)}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="shrink-0 text-left lg:text-right">
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-400">
            {itemCount} item{itemCount === 1 ? "" : "s"}
          </p>
          <p className="mt-1 text-2xl font-black">
            {formatAdminCurrency(order.total)}
          </p>
          {order.closedAt && (
            <p className="mt-2 text-xs text-stone-500">
              Closed {formatAdminDate(order.closedAt)}
            </p>
          )}
          <OrderActions
            order={order}
            busy={busy}
            onAccept={onAccept}
            onDecline={onDecline}
            onStatus={onStatus}
            onEdit={onEdit}
            onDelete={onDelete}
            onRefund={onRefund}
            onCashCollected={onCashCollected}
            onHistory={onHistory}
          />
        </div>
      </div>
    </AdminCard>
  );
}

function OrderActions({
  order,
  busy,
  onAccept,
  onDecline,
  onStatus,
  onEdit,
  onDelete,
  onRefund,
  onCashCollected,
  onHistory,
}: {
  order: RestaurantOrder;
  busy: boolean;
  onAccept: () => void;
  onDecline: () => void;
  onStatus: (
    status: "preparing" | "ready" | "completed" | "cancelled",
  ) => void;
  onEdit: () => void;
  onDelete: () => void;
  onRefund: () => void;
  onCashCollected: () => void;
  onHistory: () => void;
}) {
  const managementActions = (
    <div className="mt-2 flex gap-2 lg:flex-col">
      <button
        type="button"
        disabled={busy}
        onClick={onHistory}
        className={secondaryButtonClassName}
      >
        <History className="size-4" />
        View history
      </button>
      {!closedStatuses.includes(order.status) && (
        <button
          type="button"
          disabled={busy}
          onClick={onEdit}
          className={secondaryButtonClassName}
        >
          <Pencil className="size-4" />
          Edit
        </button>
      )}
      <button
        type="button"
        disabled={busy}
        onClick={onDelete}
        className={`${secondaryButtonClassName} text-red-700`}
      >
        <Trash2 className="size-4" />
        Delete
      </button>
      {order.paymentMethod === "online" &&
        order.paymentStatus === "captured" && (
        <button
          type="button"
          disabled={busy}
          onClick={onRefund}
          className={`${secondaryButtonClassName} text-amber-800`}
        >
          <ReceiptText className="size-4" />
          Refund payment
        </button>
      )}
      {(order.paymentMethod === "cash_on_site" ||
        order.paymentMethod === "cash_on_delivery") &&
        order.paymentStatus !== "captured" &&
        order.paymentStatus !== "refunded" && (
          <button
            type="button"
            disabled={busy}
            onClick={onCashCollected}
            className={`${secondaryButtonClassName} text-emerald-800`}
          >
            <Banknote className="size-4" />
            Mark cash collected
          </button>
        )}
    </div>
  );

  if (closedStatuses.includes(order.status)) return managementActions;

  if (order.status === "pending") {
    return (
      <div className="mt-4 flex gap-2 lg:flex-col">
        <button
          type="button"
          disabled={busy}
          onClick={onAccept}
          className={primaryButtonClassName}
        >
          <CheckCircle2 className="size-4" />
          Accept
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onDecline}
          className={`${secondaryButtonClassName} text-red-700`}
        >
          <XCircle className="size-4" />
          Decline
        </button>
        {managementActions}
      </div>
    );
  }

  const nextActions = {
    accepted: {
      status: "preparing" as const,
      label: "Start preparing",
      icon: ChefHat,
    },
    preparing: { status: "ready" as const, label: "Mark ready", icon: Play },
    ready: {
      status: "completed" as const,
      label: "Complete",
      icon: CheckCircle2,
    },
  };
  const next =
    order.status === "accepted" ||
    order.status === "preparing" ||
    order.status === "ready"
      ? nextActions[order.status]
      : undefined;

  return (
    <div>
      <div className="mt-4 flex gap-2 lg:flex-col">
        {next && (
          <button
            type="button"
            disabled={busy}
            onClick={() => onStatus(next.status)}
            className={primaryButtonClassName}
          >
            <next.icon className="size-4" />
            {next.label}
          </button>
        )}
        <button
          type="button"
          disabled={busy}
          onClick={() => onStatus("cancelled")}
          className={`${secondaryButtonClassName} text-red-700`}
        >
          Cancel order
        </button>
      </div>
      {managementActions}
    </div>
  );
}

function DeclineOrderModal({
  order,
  busy,
  onClose,
  onDecline,
}: {
  order: RestaurantOrder;
  busy: boolean;
  onClose: () => void;
  onDecline: (reason: string) => Promise<void>;
}) {
  const [reason, setReason] = useState("");
  return (
    <AdminModal title={`Decline order #${order.orderNumber}`} onClose={onClose}>
      <form
        className="space-y-4"
        onSubmit={async (event) => {
          event.preventDefault();
          await onDecline(reason);
        }}
      >
        <p className="text-sm text-stone-600">
          The reason is required and will be stored with the rejected order.
        </p>
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold">
            Decline reason
          </span>
          <textarea
            className={`${fieldClassName} h-24 py-3`}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            minLength={3}
            maxLength={300}
            required
          />
        </label>
        <div className="flex gap-3">
          <button
            type="button"
            className={`${secondaryButtonClassName} flex-1`}
            onClick={onClose}
          >
            Keep order
          </button>
          <button
            type="submit"
            disabled={busy}
            className="inline-flex h-10 flex-1 items-center justify-center rounded-xl bg-red-700 px-4 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-50"
          >
            {busy ? "Declining…" : "Decline order"}
          </button>
        </div>
      </form>
    </AdminModal>
  );
}

function OrderEditorModal({
  restaurant,
  order,
  onClose,
  onSave,
}: {
  restaurant: Restaurant;
  order: RestaurantOrder | null;
  onClose: () => void;
  onSave: (input: Omit<OrderInput, "restaurantId">) => Promise<void>;
}) {
  const menu = getPublicMenu(restaurant.slug);
  const [customerName, setCustomerName] = useState(order?.customerName ?? "");
  const [customerEmail, setCustomerEmail] = useState(
    order?.customerEmail ?? "",
  );
  const [customerPhone, setCustomerPhone] = useState(
    order?.customerPhone ?? "",
  );
  const [preferredChannel, setPreferredChannel] = useState<"email" | "sms">(
    order?.preferredChannel ?? "email",
  );
  const [orderType, setOrderType] = useState<
    "table" | "takeaway" | "delivery"
  >(order?.orderType ?? "table");
  const [paymentMethod, setPaymentMethod] = useState<
    "online" | "cash_on_site" | "cash_on_delivery" | "external_card"
  >(order?.paymentMethod ?? "cash_on_site");
  const [cashOnDeliveryEnabled, setCashOnDeliveryEnabled] = useState(false);
  const [deliveryStreet, setDeliveryStreet] = useState(
    order?.deliveryAddress?.street ?? "",
  );
  const [deliveryPostalCode, setDeliveryPostalCode] = useState(
    order?.deliveryAddress?.postalCode ?? "",
  );
  const [deliveryCity, setDeliveryCity] = useState(
    order?.deliveryAddress?.city ?? "",
  );
  const [tableNumber, setTableNumber] = useState(order?.tableNumber ?? "");
  const [items, setItems] = useState(() => {
    if (order?.items.length) {
      return order.items.map((item) => {
        const menuItem =
          menu.find((candidate) => candidate.id === item.menuItemId) ??
          menu.find((candidate) => candidate.name === item.name);
        return menuItem
          ? {
              menuItemId: menuItem.id,
              name: menuItem.name,
              quantity: item.quantity,
              unitPrice: menuItem.price,
            }
          : item;
      });
    }
    return [];
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const total = items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0,
  );

  useEffect(() => {
    fetch(`/api/restaurants/${encodeURIComponent(restaurant.id)}/availability`, {
      cache: "no-store",
    })
      .then((response) => response.json())
      .then(
        (body: {
          availability?: { cashOnDeliveryEnabled?: boolean };
        }) =>
          setCashOnDeliveryEnabled(
            body.availability?.cashOnDeliveryEnabled === true,
          ),
      )
      .catch(() => undefined);
  }, [restaurant.id]);

  return (
    <AdminModal title={order ? "Edit order" : "Create order"} onClose={onClose}>
      <form
        className="space-y-5"
        onSubmit={async (event) => {
          event.preventDefault();
          setSaving(true);
          setError("");
          try {
            await onSave({
              customerName,
              customerEmail: customerEmail || undefined,
              customerPhone: customerPhone || undefined,
              preferredChannel,
              paymentMethod,
              orderType,
              deliveryAddress:
                orderType === "delivery"
                  ? {
                      street: deliveryStreet,
                      postalCode: deliveryPostalCode,
                      city: deliveryCity,
                      countryCode: "DE",
                    }
                  : undefined,
              tableNumber: tableNumber || undefined,
              items,
            });
          } catch (reason) {
            setError(
              reason instanceof Error ? reason.message : "Unable to save order",
            );
          } finally {
            setSaving(false);
          }
        }}
      >
        {error && (
          <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-sm font-semibold">
              Customer name
            </span>
            <input
              className={fieldClassName}
              value={customerName}
              onChange={(event) => setCustomerName(event.target.value)}
              minLength={2}
              maxLength={100}
              required
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold">Email</span>
            <input
              className={fieldClassName}
              type="email"
              value={customerEmail}
              onChange={(event) => setCustomerEmail(event.target.value)}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold">Phone</span>
            <input
              className={fieldClassName}
              type="tel"
              value={customerPhone}
              onChange={(event) => setCustomerPhone(event.target.value)}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold">
              Confirmation channel
            </span>
            <select
              className={fieldClassName}
              value={preferredChannel}
              onChange={(event) =>
                setPreferredChannel(event.target.value as "email" | "sms")
              }
            >
              <option value="email">Email</option>
              <option value="sms">SMS</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold">
              Order type
            </span>
            <select
              className={fieldClassName}
              value={orderType}
              onChange={(event) => {
                const next = event.target.value as
                  | "table"
                  | "takeaway"
                  | "delivery";
                setOrderType(next);
                if (next === "delivery" && paymentMethod === "cash_on_site") {
                  setPaymentMethod("online");
                }
                if (
                  next !== "delivery" &&
                  paymentMethod === "cash_on_delivery"
                ) {
                  setPaymentMethod("cash_on_site");
                }
              }}
            >
              <option value="table">Table</option>
              <option value="takeaway">Takeaway</option>
              <option value="delivery">Delivery</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold">
              Payment method
            </span>
            <select
              className={fieldClassName}
              value={paymentMethod}
              onChange={(event) =>
                setPaymentMethod(
                  event.target.value as
                    | "online"
                    | "cash_on_site"
                    | "cash_on_delivery"
                    | "external_card",
                )
              }
            >
              <option value="online">Online payment</option>
              {orderType !== "delivery" && (
                <option value="cash_on_site">
                  {orderType === "takeaway"
                    ? "Cash when picking up"
                    : "Cash at the restaurant"}
                </option>
              )}
              {orderType === "delivery" && cashOnDeliveryEnabled && (
                <option value="cash_on_delivery">Cash on delivery</option>
              )}
              <option value="external_card">Paid on external terminal</option>
            </select>
          </label>
          {orderType === "table" && (
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold">
                Table number
              </span>
              <input
                className={fieldClassName}
                value={tableNumber}
                onChange={(event) => setTableNumber(event.target.value)}
              />
            </label>
          )}
          {orderType === "delivery" && (
            <>
              <label className="block sm:col-span-2">
                <span className="mb-1.5 block text-sm font-semibold">
                  Street and house number
                </span>
                <input
                  className={fieldClassName}
                  value={deliveryStreet}
                  onChange={(event) => setDeliveryStreet(event.target.value)}
                  minLength={3}
                  maxLength={120}
                  required
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold">
                  German postal code
                </span>
                <input
                  className={fieldClassName}
                  value={deliveryPostalCode}
                  onChange={(event) =>
                    setDeliveryPostalCode(event.target.value)
                  }
                  pattern="[0-9]{5}"
                  maxLength={5}
                  required
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold">City</span>
                <input
                  className={fieldClassName}
                  value={deliveryCity}
                  onChange={(event) => setDeliveryCity(event.target.value)}
                  minLength={2}
                  maxLength={80}
                  required
                />
              </label>
            </>
          )}
        </div>

        <div>
          <div className="mb-3">
            <h3 className="font-bold">Select from the menu</h3>
            <p className="mt-1 text-xs text-stone-500">
              Click an item to add it. Click it again to increase the quantity.
            </p>
          </div>
          {menu.length === 0 ? (
            <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              This restaurant has no published menu items yet.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {menu.map((menuItem) => {
                const selected = items.find(
                  (item) => item.menuItemId === menuItem.id,
                );
                return (
                  <button
                    key={menuItem.id}
                    type="button"
                    aria-pressed={Boolean(selected)}
                    onClick={() =>
                      setItems((current) => {
                        const existing = current.find(
                          (item) => item.menuItemId === menuItem.id,
                        );
                        return existing
                          ? current.map((item) =>
                              item.menuItemId === menuItem.id
                                ? {
                                    ...item,
                                    quantity: Math.min(99, item.quantity + 1),
                                  }
                                : item,
                            )
                          : [
                              ...current,
                              {
                                menuItemId: menuItem.id,
                                name: menuItem.name,
                                quantity: 1,
                                unitPrice: menuItem.price,
                              },
                            ];
                      })
                    }
                    className={`relative min-h-24 rounded-xl border p-3 text-left transition ${
                      selected
                        ? "border-amber-600 bg-amber-50 ring-2 ring-amber-600/20"
                        : "border-stone-200 bg-white hover:border-amber-400 hover:bg-amber-50/40"
                    }`}
                  >
                    {selected && (
                      <span className="absolute right-2 top-2 grid min-w-6 place-items-center rounded-full bg-amber-700 px-1.5 py-0.5 text-xs font-black text-white">
                        {selected.quantity}
                      </span>
                    )}
                    <span className="block pr-7 text-sm font-bold leading-tight">
                      {menuItem.name}
                    </span>
                    <span className="mt-1 block text-[11px] text-stone-500">
                      {menuItem.category}
                    </span>
                    <span className="mt-2 block text-sm font-black text-amber-700">
                      {formatAdminCurrency(menuItem.price)}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-bold">Selected items</h3>
            <AdminBadge>{items.length} selected</AdminBadge>
          </div>
          {items.length === 0 ? (
            <p className="rounded-xl bg-stone-50 p-4 text-center text-sm text-stone-500">
              Select at least one menu item above.
            </p>
          ) : (
            <div className="space-y-2">
              {items.map((item) => (
                <div
                  key={item.menuItemId ?? item.name}
                  className="flex items-center gap-3 rounded-xl border border-stone-200 bg-white p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">{item.name}</p>
                    <p className="text-xs text-stone-500">
                      {formatAdminCurrency(item.unitPrice)} each
                    </p>
                  </div>
                  <div className="flex items-center rounded-lg bg-stone-100 p-1">
                    <button
                      type="button"
                      onClick={() =>
                        setItems((current) =>
                          item.quantity === 1
                            ? current.filter(
                                (candidate) =>
                                  candidate.menuItemId !== item.menuItemId,
                              )
                            : current.map((candidate) =>
                                candidate.menuItemId === item.menuItemId
                                  ? {
                                      ...candidate,
                                      quantity: candidate.quantity - 1,
                                    }
                                  : candidate,
                              ),
                        )
                      }
                      className="grid size-8 place-items-center rounded-md bg-white text-stone-700 hover:bg-stone-200"
                      aria-label={`Decrease ${item.name}`}
                    >
                      <Minus className="size-4" />
                    </button>
                    <span className="w-8 text-center text-sm font-black">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setItems((current) =>
                          current.map((candidate) =>
                            candidate.menuItemId === item.menuItemId
                              ? {
                                  ...candidate,
                                  quantity: Math.min(
                                    99,
                                    candidate.quantity + 1,
                                  ),
                                }
                              : candidate,
                          ),
                        )
                      }
                      className="grid size-8 place-items-center rounded-md bg-stone-950 text-white hover:bg-amber-700"
                      aria-label={`Increase ${item.name}`}
                    >
                      <Plus className="size-4" />
                    </button>
                  </div>
                  <p className="w-20 text-right text-sm font-black">
                    {formatAdminCurrency(item.quantity * item.unitPrice)}
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      setItems((current) =>
                        current.filter(
                          (candidate) =>
                            candidate.menuItemId !== item.menuItemId,
                        ),
                      )
                    }
                    className="grid size-9 place-items-center rounded-lg text-red-700 hover:bg-red-50"
                    aria-label={`Remove ${item.name}`}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between rounded-xl bg-stone-50 p-4">
          <span className="font-semibold text-stone-600">Order total</span>
          <strong className="text-xl">{formatAdminCurrency(total)}</strong>
        </div>
        <p className="text-xs text-stone-500">
          Prices come from {restaurant.name}&apos;s menu and cannot be
          overwritten. At least one valid email or phone number is required.
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            className={`${secondaryButtonClassName} flex-1`}
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={
              saving ||
              items.length === 0 ||
              items.some((item) => !item.menuItemId)
            }
            className={`${primaryButtonClassName} flex-1`}
          >
            {saving ? "Saving…" : order ? "Save changes" : "Create order"}
          </button>
        </div>
      </form>
    </AdminModal>
  );
}
