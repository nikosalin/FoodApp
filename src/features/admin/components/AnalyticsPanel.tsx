"use client";

import {
  CalendarDays,
  Clock3,
  Euro,
  ReceiptText,
  TrendingUp,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { subscribeToAdminState } from "../lib/admin-store";
import type { Restaurant, RestaurantOrder } from "../types";
import {
  AdminCard,
  fieldClassName,
  formatAdminCurrency,
} from "./AdminUi";

type Period = "day" | "week" | "month";

type DailyTotal = {
  key: string;
  label: string;
  revenue: number;
  orders: number;
};

function startOfDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function endOfDay(value: Date) {
  return new Date(
    value.getFullYear(),
    value.getMonth(),
    value.getDate(),
    23,
    59,
    59,
    999,
  );
}

function dateKey(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function periodRange(period: Period, today: Date) {
  const end = endOfDay(today);
  if (period === "day") return { start: startOfDay(today), end };
  if (period === "week") {
    const start = startOfDay(today);
    start.setDate(start.getDate() - 6);
    return { start, end };
  }
  return {
    start: new Date(today.getFullYear(), today.getMonth(), 1),
    end,
  };
}

function daysInRange(start: Date, end: Date) {
  const dates: Date[] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    dates.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

export function AnalyticsPanel() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [orders, setOrders] = useState<RestaurantOrder[]>([]);
  const [restaurantId, setRestaurantId] = useState("");
  const [period, setPeriod] = useState<Period>("week");

  useEffect(
    () =>
      subscribeToAdminState((state) => {
        setRestaurants(state.restaurants);
        setOrders(state.orders);
        setRestaurantId((current) => current || state.restaurants[0]?.id || "");
      }),
    [],
  );

  const analytics = useMemo(() => {
    const now = new Date();
    const { start, end } = periodRange(period, now);
    const completed = orders.filter((order) => {
      if (order.status !== "completed" || !order.closedAt) return false;
      const closedAt = new Date(order.closedAt);
      return (
        order.restaurantId === restaurantId &&
        closedAt >= start &&
        closedAt <= end
      );
    });

    const dailyMap = new Map<string, DailyTotal>(
      daysInRange(start, end).map((date) => [
        dateKey(date),
        {
          key: dateKey(date),
          label: new Intl.DateTimeFormat("en-DE", {
            weekday: period === "week" ? "short" : undefined,
            day: "2-digit",
            month: "short",
          }).format(date),
          revenue: 0,
          orders: 0,
        },
      ]),
    );
    const hourly = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      revenue: 0,
      orders: 0,
    }));

    for (const order of completed) {
      const closedAt = new Date(order.closedAt!);
      const daily = dailyMap.get(dateKey(closedAt));
      if (daily) {
        daily.revenue += order.total;
        daily.orders += 1;
      }
      hourly[closedAt.getHours()].revenue += order.total;
      hourly[closedAt.getHours()].orders += 1;
    }

    const daily = [...dailyMap.values()];
    const totalRevenue = completed.reduce((sum, order) => sum + order.total, 0);
    const bestDay = daily.reduce<DailyTotal | null>(
      (best, day) => (!best || day.revenue > best.revenue ? day : best),
      null,
    );
    const peakHour = hourly.reduce(
      (peak, hour) => (hour.revenue > peak.revenue ? hour : peak),
      hourly[0],
    );

    return {
      daily,
      hourly,
      completed,
      totalRevenue,
      averageOrder:
        completed.length === 0 ? 0 : totalRevenue / completed.length,
      bestDay,
      peakHour,
    };
  }, [orders, period, restaurantId]);

  const selectedRestaurant = restaurants.find(
    (restaurant) => restaurant.id === restaurantId,
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-amber-700">
            Sales intelligence
          </p>
          <h1 className="mt-1 text-3xl font-black">Analytics</h1>
          <p className="mt-2 text-stone-500">
            Understand revenue trends and when customers are buying.
          </p>
        </div>
        <select
          className={`${fieldClassName} w-full sm:w-64`}
          value={restaurantId}
          onChange={(event) => setRestaurantId(event.target.value)}
          aria-label="Choose restaurant"
        >
          {restaurants.map((restaurant) => (
            <option key={restaurant.id} value={restaurant.id}>
              {restaurant.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex w-fit rounded-xl bg-stone-200 p-1">
        {(
          [
            ["day", "Today"],
            ["week", "Last 7 days"],
            ["month", "This month"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setPeriod(value)}
            className={`rounded-lg px-4 py-2 text-sm font-bold transition ${
              period === value
                ? "bg-white text-stone-950 shadow-sm"
                : "text-stone-500 hover:text-stone-950"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <p className="text-sm text-stone-500">
        Showing completed sales for{" "}
        <strong className="text-stone-800">
          {selectedRestaurant?.name ?? "the selected restaurant"}
        </strong>
        .
      </p>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Revenue"
          value={formatAdminCurrency(analytics.totalRevenue)}
          icon={Euro}
          iconClassName="bg-emerald-100 text-emerald-700"
        />
        <MetricCard
          label="Completed orders"
          value={analytics.completed.length.toString()}
          icon={ReceiptText}
          iconClassName="bg-sky-100 text-sky-700"
        />
        <MetricCard
          label="Average order"
          value={formatAdminCurrency(analytics.averageOrder)}
          icon={TrendingUp}
          iconClassName="bg-violet-100 text-violet-700"
        />
        <MetricCard
          label="Peak sales time"
          value={
            analytics.peakHour.revenue > 0
              ? `${String(analytics.peakHour.hour).padStart(2, "0")}:00`
              : "—"
          }
          icon={Clock3}
          iconClassName="bg-amber-100 text-amber-700"
        />
      </div>

      <AdminCard>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-black">
              <TrendingUp className="size-5 text-amber-700" />
              Revenue wave
            </h2>
            <p className="mt-1 text-sm text-stone-500">
              Completed revenue for each day in the selected period.
            </p>
          </div>
          {analytics.bestDay && analytics.bestDay.revenue > 0 && (
            <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              Best day: <strong>{analytics.bestDay.label}</strong> ·{" "}
              {formatAdminCurrency(analytics.bestDay.revenue)}
            </p>
          )}
        </div>
        <DailySalesChart data={analytics.daily} />
      </AdminCard>

      <AdminCard>
        <div>
          <h2 className="flex items-center gap-2 text-lg font-black">
            <Clock3 className="size-5 text-amber-700" />
            Sales by time of day
          </h2>
          <p className="mt-1 text-sm text-stone-500">
            Revenue grouped by the hour each order was completed.
          </p>
        </div>
        <HourlySalesChart data={analytics.hourly} />
      </AdminCard>

      <AdminCard>
        <h2 className="flex items-center gap-2 text-lg font-black">
          <CalendarDays className="size-5 text-amber-700" />
          Daily totals
        </h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-lg text-left text-sm">
            <thead>
              <tr className="border-b border-stone-200 text-stone-500">
                <th className="py-3 font-semibold">Date</th>
                <th className="py-3 text-right font-semibold">Orders</th>
                <th className="py-3 text-right font-semibold">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {[...analytics.daily].reverse().map((day) => (
                <tr key={day.key} className="border-b border-stone-100">
                  <td className="py-3 font-medium">{day.label}</td>
                  <td className="py-3 text-right text-stone-600">
                    {day.orders}
                  </td>
                  <td className="py-3 text-right font-bold">
                    {formatAdminCurrency(day.revenue)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminCard>
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon: Icon,
  iconClassName,
}: {
  label: string;
  value: string;
  icon: typeof Euro;
  iconClassName: string;
}) {
  return (
    <AdminCard>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-stone-500">{label}</p>
          <p className="mt-2 text-2xl font-black">{value}</p>
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

function DailySalesChart({ data }: { data: DailyTotal[] }) {
  return (
    <div className="mt-7 h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 10, right: 12, left: 4, bottom: 0 }}
          accessibilityLayer
        >
          <defs>
            <linearGradient id="revenueWave" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#d97706" stopOpacity={0.42} />
              <stop offset="95%" stopColor="#d97706" stopOpacity={0.03} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={64}
            tickFormatter={(value) => `€${value}`}
          />
          <Tooltip
            formatter={(value) => [
              formatAdminCurrency(Number(value)),
              "Revenue",
            ]}
          />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke="#b45309"
            strokeWidth={3}
            fill="url(#revenueWave)"
            activeDot={{ r: 6 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function HourlySalesChart({
  data,
}: {
  data: { hour: number; revenue: number; orders: number }[];
}) {
  return (
    <div className="mt-7 h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 10, right: 12, left: 4, bottom: 0 }}
          accessibilityLayer
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="hour"
            tickLine={false}
            axisLine={false}
            tickFormatter={(hour) =>
              Number(hour) % 3 === 0
                ? `${String(hour).padStart(2, "0")}:00`
                : ""
            }
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={64}
            tickFormatter={(value) => `€${value}`}
          />
          <Tooltip
            labelFormatter={(hour) =>
              `${String(hour).padStart(2, "0")}:00–${String(
                (Number(hour) + 1) % 24,
              ).padStart(2, "0")}:00`
            }
            formatter={(value) => [
              formatAdminCurrency(Number(value)),
              "Revenue",
            ]}
          />
          <Bar dataKey="revenue" fill="#292524" radius={[5, 5, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
