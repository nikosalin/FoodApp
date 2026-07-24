"use client";

import {
  AlertCircle,
  Euro,
  FileText,
  ShoppingBag,
  Store,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { subscribeToAdminState } from "../lib/admin-store";
import type { AdminState } from "../types";
import {
  AdminCard,
  formatAdminCurrency,
} from "./AdminUi";

const emptyState: AdminState = {
  requests: [],
  restaurants: [],
  orders: [],
  totalOrders: 0,
  todayRevenue: 0,
};

export function DashboardOverview() {
  const [state, setState] = useState(emptyState);

  useEffect(() => subscribeToAdminState(setState), []);

  const activeRestaurants = state.restaurants.filter(
    (restaurant) => restaurant.status === "active",
  ).length;

  const stats = [
    {
      label: "Active restaurants",
      value: activeRestaurants,
      icon: Store,
      iconStyle: "bg-emerald-100 text-emerald-700",
    },
    {
      label: "Pending requests",
      value: state.requests.length,
      icon: FileText,
      iconStyle: "bg-amber-100 text-amber-700",
    },
    {
      label: "Total orders",
      value: state.totalOrders.toLocaleString(),
      icon: ShoppingBag,
      iconStyle: "bg-sky-100 text-sky-700",
    },
    {
      label: "Today's revenue",
      value: formatAdminCurrency(state.todayRevenue),
      icon: Euro,
      iconStyle: "bg-violet-100 text-violet-700",
    },
  ];

  return (
    <div className="space-y-7">
      <div>
        <p className="text-sm font-semibold uppercase tracking-widest text-amber-700">
          Platform control
        </p>
        <h1 className="mt-1 text-3xl font-black">Platform overview</h1>
        <p className="mt-2 text-stone-500">
          Monitor your restaurant network and act on new registrations.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <AdminCard key={stat.label}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm text-stone-500">{stat.label}</p>
                <p className="mt-2 text-3xl font-black">{stat.value}</p>
              </div>
              <span
                className={`grid size-11 place-items-center rounded-xl ${stat.iconStyle}`}
              >
                <stat.icon className="size-5" />
              </span>
            </div>
          </AdminCard>
        ))}
      </div>

      <AdminCard>
        <h2 className="text-lg font-bold">Quick actions</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {[
            {
              href: "/admin/requests",
              title: "Review requests",
              detail: `${state.requests.length} waiting for review`,
              icon: FileText,
            },
            {
              href: "/admin/restaurants",
              title: "Manage restaurants",
              detail: `${state.restaurants.length} registered restaurants`,
              icon: Store,
            },
            {
              href: "/admin/analytics",
              title: "View analytics",
              detail: "Platform performance metrics",
              icon: TrendingUp,
            },
          ].map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="rounded-xl border border-stone-200 p-4 transition hover:border-amber-500 hover:bg-amber-50"
            >
              <action.icon className="size-7 text-amber-700" />
              <p className="mt-3 font-bold">{action.title}</p>
              <p className="mt-1 text-sm text-stone-500">{action.detail}</p>
            </Link>
          ))}
        </div>
      </AdminCard>

      {state.requests.length > 0 && (
        <div className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <AlertCircle className="mt-0.5 size-5 shrink-0 text-amber-700" />
          <p className="text-sm text-stone-700">
            <strong>Action required:</strong> {state.requests.length} restaurant
            registration{state.requests.length === 1 ? " is" : "s are"} waiting
            for review.{" "}
            <Link href="/admin/requests" className="font-bold underline">
              Review now
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}
