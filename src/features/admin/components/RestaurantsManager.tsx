"use client";

import {
  Ban,
  Calendar,
  CheckCircle2,
  Crown,
  Eye,
  Mail,
  MapPin,
  Phone,
  Search,
  ShoppingBag,
  Store,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { subscriptionPlans } from "../data/seed";
import {
  subscribeToAdminState,
  toggleRestaurant,
} from "../lib/admin-store";
import type { Restaurant, RestaurantStatus } from "../types";
import {
  AdminBadge,
  AdminCard,
  AdminModal,
  fieldClassName,
  formatAdminDate,
  primaryButtonClassName,
  secondaryButtonClassName,
} from "./AdminUi";

export function RestaurantsManager() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<RestaurantStatus | "all">("all");
  const [details, setDetails] = useState<Restaurant | null>(null);
  const [toggleTarget, setToggleTarget] = useState<Restaurant | null>(null);

  useEffect(
    () => subscribeToAdminState((state) => setRestaurants(state.restaurants)),
    [],
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return restaurants.filter((restaurant) => {
      const matchesSearch =
        !term ||
        [
          restaurant.name,
          restaurant.ownerName,
          restaurant.phone,
          restaurant.city,
        ].some((value) => value.toLowerCase().includes(term));
      return matchesSearch && (status === "all" || restaurant.status === status);
    });
  }, [restaurants, search, status]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-amber-700">
            Network
          </p>
          <h1 className="mt-1 text-3xl font-black">All restaurants</h1>
          <p className="mt-2 text-stone-500">
            Search, review and control restaurant access.
          </p>
        </div>
        <div className="flex gap-2">
          <AdminBadge>{restaurants.length} total</AdminBadge>
          <AdminBadge tone="success">
            {restaurants.filter((item) => item.status === "active").length}{" "}
            active
          </AdminBadge>
        </div>
      </div>

      <AdminCard className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <label className="relative flex-1">
            <Search className="absolute left-3 top-3.5 size-4 text-stone-400" />
            <input
              className={`${fieldClassName} pl-10`}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name, owner, phone or city"
              aria-label="Search restaurants"
            />
          </label>
          <select
            className={`${fieldClassName} sm:w-48`}
            value={status}
            onChange={(event) =>
              setStatus(event.target.value as RestaurantStatus | "all")
            }
            aria-label="Filter restaurant status"
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="trial">Trial</option>
            <option value="blocked">Blocked</option>
          </select>
        </div>
      </AdminCard>

      {filtered.length === 0 ? (
        <AdminCard className="py-14 text-center">
          <Store className="mx-auto size-14 text-stone-300" />
          <h2 className="mt-4 text-xl font-bold">No restaurants found</h2>
          <p className="mt-1 text-stone-500">Try adjusting your filters.</p>
        </AdminCard>
      ) : (
        <div className="grid gap-4">
          {filtered.map((restaurant) => (
            <AdminCard key={restaurant.id}>
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-bold">{restaurant.name}</h2>
                    <StatusBadge status={restaurant.status} />
                    <AdminBadge>
                      {restaurant.subscriptionPlan === "pro" && (
                        <Crown className="mr-1 size-3" />
                      )}
                      {subscriptionPlans[restaurant.subscriptionPlan].name}
                    </AdminBadge>
                  </div>
                  <p className="mt-1 text-sm text-stone-500">
                    {restaurant.restaurantType}
                  </p>
                  <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-3">
                    <p className="flex items-center gap-2">
                      <Store className="size-4 text-stone-400" />
                      {restaurant.ownerName}
                    </p>
                    <a
                      href={`tel:${restaurant.phone}`}
                      className="flex items-center gap-2 hover:text-amber-700"
                    >
                      <Phone className="size-4 text-stone-400" />
                      {restaurant.phone}
                    </a>
                    <a
                      href={`mailto:${restaurant.email}`}
                      className="flex items-center gap-2 hover:text-amber-700"
                    >
                      <Mail className="size-4 text-stone-400" />
                      {restaurant.email}
                    </a>
                    <p className="flex items-center gap-2">
                      <MapPin className="size-4 text-stone-400" />
                      {restaurant.city}
                    </p>
                    <p className="flex items-center gap-2">
                      <Calendar className="size-4 text-stone-400" />
                      {formatAdminDate(restaurant.createdAt)}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 lg:w-40 lg:flex-col">
                  <Link
                    href={`/admin/restaurants/${restaurant.id}`}
                    className={`${primaryButtonClassName} flex-1`}
                  >
                    <ShoppingBag className="size-4" />
                    Orders
                  </Link>
                  <button
                    type="button"
                    className={`${secondaryButtonClassName} flex-1`}
                    onClick={() => setDetails(restaurant)}
                  >
                    <Eye className="size-4" />
                    View
                  </button>
                  <button
                    type="button"
                    className={`flex-1 ${
                      restaurant.status === "blocked"
                        ? primaryButtonClassName
                        : "inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-red-700 px-4 text-sm font-semibold text-white hover:bg-red-800"
                    }`}
                    onClick={() => setToggleTarget(restaurant)}
                  >
                    {restaurant.status === "blocked" ? (
                      <CheckCircle2 className="size-4" />
                    ) : (
                      <Ban className="size-4" />
                    )}
                    {restaurant.status === "blocked" ? "Unblock" : "Block"}
                  </button>
                </div>
              </div>
            </AdminCard>
          ))}
        </div>
      )}

      {details && (
        <RestaurantDetails
          restaurant={details}
          onClose={() => setDetails(null)}
        />
      )}
      {toggleTarget && (
        <ToggleRestaurantModal
          restaurant={toggleTarget}
          onClose={() => setToggleTarget(null)}
        />
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: RestaurantStatus }) {
  const config = {
    active: { label: "Active", tone: "success" as const },
    trial: { label: "Trial", tone: "warning" as const },
    blocked: { label: "Blocked", tone: "danger" as const },
  };
  return (
    <AdminBadge tone={config[status].tone}>{config[status].label}</AdminBadge>
  );
}

function RestaurantDetails({
  restaurant,
  onClose,
}: {
  restaurant: Restaurant;
  onClose: () => void;
}) {
  const plan = subscriptionPlans[restaurant.subscriptionPlan];
  const details = [
    ["Owner", restaurant.ownerName],
    ["Phone", restaurant.phone],
    ["Email", restaurant.email],
    ["City", restaurant.city],
    ["Address", restaurant.address],
    ["Restaurant URL", `/${restaurant.slug}`],
    ["Registered", formatAdminDate(restaurant.createdAt)],
    ["Last updated", formatAdminDate(restaurant.updatedAt)],
  ];

  return (
    <AdminModal title="Restaurant details" onClose={onClose}>
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="mr-auto text-xl font-black">{restaurant.name}</h3>
        <StatusBadge status={restaurant.status} />
        <AdminBadge>{plan.name}</AdminBadge>
      </div>
      <dl className="mt-6 grid gap-4 sm:grid-cols-2">
        {details.map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs font-semibold uppercase tracking-wide text-stone-400">
              {label}
            </dt>
            <dd className="mt-1 break-words text-sm text-stone-800">{value}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-5 rounded-xl bg-stone-50 p-4 text-sm">
        <p>
          <strong>Plan:</strong> {plan.name} (€{plan.price}/month)
        </p>
        {restaurant.internalNotes && (
          <p className="mt-2">
            <strong>Internal notes:</strong> {restaurant.internalNotes}
          </p>
        )}
        {restaurant.blockReason && (
          <p className="mt-2 text-red-700">
            <strong>Block reason:</strong> {restaurant.blockReason}
          </p>
        )}
      </div>
      <button
        type="button"
        className={`${primaryButtonClassName} mt-5 w-full`}
        onClick={onClose}
      >
        Close
      </button>
    </AdminModal>
  );
}

function ToggleRestaurantModal({
  restaurant,
  onClose,
}: {
  restaurant: Restaurant;
  onClose: () => void;
}) {
  const blocked = restaurant.status === "blocked";
  const [reason, setReason] = useState("");

  return (
    <AdminModal
      title={blocked ? "Unblock restaurant" : "Block restaurant"}
      onClose={onClose}
    >
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          toggleRestaurant(restaurant.id, reason);
          onClose();
        }}
      >
        <p className="text-stone-600">
          {blocked ? "Restore" : "Suspend"} dashboard access for{" "}
          <strong className="text-stone-950">{restaurant.name}</strong>?
        </p>
        {!blocked && (
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold">
              Reason for blocking
            </span>
            <textarea
              className={`${fieldClassName} h-24 py-3`}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              required
            />
          </label>
        )}
        {blocked && restaurant.blockReason && (
          <p className="rounded-xl bg-stone-50 p-3 text-sm text-stone-600">
            Previously blocked for: {restaurant.blockReason}
          </p>
        )}
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
            className={`flex-1 ${
              blocked
                ? primaryButtonClassName
                : "inline-flex h-10 items-center justify-center rounded-xl bg-red-700 px-4 text-sm font-semibold text-white hover:bg-red-800"
            }`}
          >
            {blocked ? "Unblock" : "Block"}
          </button>
        </div>
      </form>
    </AdminModal>
  );
}
