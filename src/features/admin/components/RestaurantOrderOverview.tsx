"use client";

import {
  ArrowLeft,
  CheckCircle2,
  ChefHat,
  Clock3,
  Euro,
  Package,
  Pencil,
  Play,
  Plus,
  ReceiptText,
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
  getRestaurantOrders,
  subscribeToRestaurantOrders,
  updateOrderStatus,
} from "@/features/orders/lib/order-api";
import type {
  OrderInput,
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
  const [view, setView] = useState<"pending" | "closed">("pending");
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

  const visibleOrders =
    view === "pending" ? summary.pending : summary.closed;

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
      </div>

      {loadingOrders ? (
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
                      `Delete order #${order.orderNumber}? This cannot be undone.`,
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
    </div>
  );
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
}) {
  const managementActions = (
    <div className="mt-2 flex gap-2 lg:flex-col">
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
    const first = menu[0];
    return first
      ? [
          {
            menuItemId: first.id,
            name: first.name,
            quantity: 1,
            unitPrice: first.price,
          },
        ]
      : [];
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const total = items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0,
  );

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
              orderType,
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
              onChange={(event) =>
                setOrderType(
                  event.target.value as "table" | "takeaway" | "delivery",
                )
              }
            >
              <option value="table">Table</option>
              <option value="takeaway">Takeaway</option>
              <option value="delivery">Delivery</option>
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
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-bold">Order items</h3>
            <button
              type="button"
              className={secondaryButtonClassName}
              disabled={menu.length === 0}
              onClick={() =>
                setItems((current) => {
                  const first = menu[0];
                  return first
                    ? [
                        ...current,
                        {
                          menuItemId: first.id,
                          name: first.name,
                          quantity: 1,
                          unitPrice: first.price,
                        },
                      ]
                    : current;
                })
              }
            >
              <Plus className="size-4" />
              Add item
            </button>
          </div>
          <div className="space-y-3">
            {items.map((item, index) => (
              <div
                key={index}
                className="grid grid-cols-[1fr_72px_100px_40px] gap-2"
              >
                <select
                  className={fieldClassName}
                  value={item.menuItemId ?? ""}
                  onChange={(event) =>
                    setItems((current) => {
                      const selected = menu.find(
                        (candidate) => candidate.id === event.target.value,
                      );
                      if (!selected) return current;
                      return current.map((candidate, itemIndex) =>
                        itemIndex === index
                          ? {
                              menuItemId: selected.id,
                              name: selected.name,
                              quantity: candidate.quantity,
                              unitPrice: selected.price,
                            }
                          : candidate,
                      );
                    })
                  }
                  required
                  aria-label="Menu item"
                >
                  {!item.menuItemId && (
                    <option value="">Select a current menu item</option>
                  )}
                  {menu.map((menuItem) => (
                    <option key={menuItem.id} value={menuItem.id}>
                      {menuItem.name}
                    </option>
                  ))}
                </select>
                <input
                  className={fieldClassName}
                  type="number"
                  min={1}
                  max={99}
                  value={item.quantity}
                  onChange={(event) =>
                    setItems((current) =>
                      current.map((candidate, itemIndex) =>
                        itemIndex === index
                          ? {
                              ...candidate,
                              quantity: Number(event.target.value),
                            }
                          : candidate,
                      ),
                    )
                  }
                  aria-label="Quantity"
                  required
                />
                <div
                  className={`${fieldClassName} flex items-center bg-stone-50 text-stone-600`}
                  aria-label="Menu price"
                >
                  {formatAdminCurrency(item.unitPrice)}
                </div>
                <button
                  type="button"
                  disabled={items.length === 1}
                  onClick={() =>
                    setItems((current) =>
                      current.filter((_, itemIndex) => itemIndex !== index),
                    )
                  }
                  className="grid h-11 place-items-center rounded-xl text-red-700 hover:bg-red-50 disabled:opacity-30"
                  aria-label="Remove item"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
          </div>
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
