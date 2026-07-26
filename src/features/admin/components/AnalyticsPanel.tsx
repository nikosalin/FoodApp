"use client";

import {
  CalendarDays,
  Clock3,
  CreditCard,
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
  Cell,
  CartesianGrid,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { subscribeToAdminState } from "../lib/admin-store";
import type { Restaurant, RestaurantOrder } from "../types";
import { getRestaurantOrders } from "@/features/orders/lib/order-api";
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

type WeekdayTotal = {
  key: string;
  label: string;
  revenue: number;
  orders: number;
  activeDays: Set<string>;
  averageRevenue: number;
  averageOrders: number;
};

type PaymentTotal = {
  key: "cash" | "card" | "unpaid";
  label: string;
  revenue: number;
  orders: number;
  color: string;
};

type WorkloadCell = {
  key: string;
  weekday: string;
  weekdayLabel: string;
  hour: number;
  revenue: number;
  orders: number;
  activeDays: Set<string>;
  averageRevenue: number;
  averageOrders: number;
};

const weekdayLabels = [
  ["monday", "Monday"],
  ["tuesday", "Tuesday"],
  ["wednesday", "Wednesday"],
  ["thursday", "Thursday"],
  ["friday", "Friday"],
  ["saturday", "Saturday"],
  ["sunday", "Sunday"],
] as const;

function paymentBucket(order: RestaurantOrder): PaymentTotal["key"] {
  const isCashPaid =
    order.paymentMethod === "cash_on_site" ||
    (order.paymentMethod === "cash_on_delivery" &&
      order.paymentStatus === "captured");
  if (isCashPaid) return "cash";
  const isCardPaid =
    order.paymentMethod === "external_card" ||
    (order.paymentMethod === "online" && order.paymentStatus === "captured");
  return isCardPaid ? "card" : "unpaid";
}

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
        setRestaurantId((current) => current || state.restaurants[0]?.id || "");
      }),
    [],
  );

  useEffect(() => {
    if (!restaurantId) return;
    let active = true;
    getRestaurantOrders(restaurantId)
      .then((result) => {
        if (active) setOrders(result);
      })
      .catch(() => {
        if (active) setOrders([]);
      });
    return () => {
      active = false;
    };
  }, [restaurantId]);

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
    const allCompleted = orders.filter(
      (order) =>
        order.restaurantId === restaurantId &&
        order.status === "completed" &&
        order.closedAt,
    );

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

    const weekday = weekdayLabels.map(
      ([key, label]): WeekdayTotal => ({
        key,
        label,
        revenue: 0,
        orders: 0,
        activeDays: new Set<string>(),
        averageRevenue: 0,
        averageOrders: 0,
      }),
    );
    const weekdayByKey = new Map(weekday.map((day) => [day.key, day]));
    const workload = weekdayLabels.flatMap(([weekday, weekdayLabel]) =>
      Array.from({ length: 24 }, (_, hour): WorkloadCell => ({
        key: `${weekday}-${hour}`,
        weekday,
        weekdayLabel,
        hour,
        revenue: 0,
        orders: 0,
        activeDays: new Set<string>(),
        averageRevenue: 0,
        averageOrders: 0,
      })),
    );
    const workloadByKey = new Map(
      workload.map((cell) => [cell.key, cell]),
    );
    for (const order of allCompleted) {
      const closedAt = new Date(order.closedAt!);
      const key = new Intl.DateTimeFormat("en-US", {
        timeZone: "Europe/Berlin",
        weekday: "long",
      })
        .format(closedAt)
        .toLowerCase();
      const day = weekdayByKey.get(key);
      if (!day) continue;
      day.revenue += order.total;
      day.orders += 1;
      day.activeDays.add(
        new Intl.DateTimeFormat("en-CA", {
          timeZone: "Europe/Berlin",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).format(closedAt),
      );
      const hour = Number(
        new Intl.DateTimeFormat("en-GB", {
          timeZone: "Europe/Berlin",
          hour: "2-digit",
          hourCycle: "h23",
        }).format(closedAt),
      );
      const cell = workloadByKey.get(`${key}-${hour}`);
      if (cell) {
        if (paymentBucket(order) !== "unpaid") {
          cell.revenue += order.total;
        }
        cell.orders += 1;
        cell.activeDays.add(
          new Intl.DateTimeFormat("en-CA", {
            timeZone: "Europe/Berlin",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          }).format(closedAt),
        );
      }
    }
    for (const day of weekday) {
      const count = day.activeDays.size;
      day.averageRevenue = count === 0 ? 0 : day.revenue / count;
      day.averageOrders = count === 0 ? 0 : day.orders / count;
    }
    for (const cell of workload) {
      const count = cell.activeDays.size;
      cell.averageRevenue = count === 0 ? 0 : cell.revenue / count;
      cell.averageOrders = count === 0 ? 0 : cell.orders / count;
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
    const bestWeekday = weekday.reduce<WeekdayTotal | null>(
      (best, day) =>
        !best || day.averageRevenue > best.averageRevenue ? day : best,
      null,
    );
    const peakWorkload = workload.reduce<WorkloadCell | null>(
      (peak, cell) =>
        !peak || cell.averageOrders > peak.averageOrders ? cell : peak,
      null,
    );
    const paymentMix: PaymentTotal[] = [
      {
        key: "cash",
        label: "Cash paid",
        revenue: 0,
        orders: 0,
        color: "#047857",
      },
      {
        key: "card",
        label: "Card paid",
        revenue: 0,
        orders: 0,
        color: "#2563eb",
      },
      {
        key: "unpaid",
        label: "Awaiting payment",
        revenue: 0,
        orders: 0,
        color: "#a8a29e",
      },
    ];
    const paymentByKey = new Map(paymentMix.map((item) => [item.key, item]));
    for (const order of completed) {
      const key = paymentBucket(order);
      const item = paymentByKey.get(key)!;
      item.revenue += order.total;
      item.orders += 1;
    }

    return {
      daily,
      hourly,
      completed,
      totalRevenue,
      averageOrder:
        completed.length === 0 ? 0 : totalRevenue / completed.length,
      bestDay,
      peakHour,
      weekday,
      bestWeekday,
      workload,
      peakWorkload,
      paymentMix,
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
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-black">
              <Clock3 className="size-5 text-amber-700" />
              Workload by weekday and hour
            </h2>
            <p className="mt-1 text-sm text-stone-500">
              Recurring completed-order peaks across all available history for
              this restaurant.
            </p>
          </div>
          {analytics.peakWorkload &&
            analytics.peakWorkload.averageOrders > 0 && (
              <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">
                Peak: <strong>{analytics.peakWorkload.weekdayLabel}</strong> ·{" "}
                {formatHour(analytics.peakWorkload.hour)} ·{" "}
                {analytics.peakWorkload.averageOrders.toFixed(1)} orders avg.
              </p>
            )}
        </div>
        <WorkloadHeatmap data={analytics.workload} />
        <p className="mt-4 text-xs leading-5 text-stone-500">
          Darker cells mean more completed orders on average for that weekday
          and hour. Hover or focus a cell for average workload, total orders,
          and paid revenue. Times use Europe/Berlin.
        </p>
      </AdminCard>

      <AdminCard>
        <div>
          <h2 className="flex items-center gap-2 text-lg font-black">
            <CreditCard className="size-5 text-amber-700" />
            Payment mix
          </h2>
          <p className="mt-1 text-sm text-stone-500">
            Cash collected and card revenue for completed orders in the selected
            period.
          </p>
        </div>
        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.8fr)]">
          <PaymentMixChart data={analytics.paymentMix} />
          <div className="grid content-center gap-3">
            {analytics.paymentMix.map((item) => {
              const percentage =
                analytics.totalRevenue === 0
                  ? 0
                  : (item.revenue / analytics.totalRevenue) * 100;
              return (
                <div
                  key={item.key}
                  className="rounded-xl border border-stone-200 p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="flex items-center gap-2 font-bold">
                      <span
                        className="size-3 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      {item.label}
                    </p>
                    <span className="text-sm font-semibold text-stone-500">
                      {percentage.toFixed(1)}%
                    </span>
                  </div>
                  <div className="mt-2 flex items-end justify-between gap-3">
                    <p className="text-xl font-black">
                      {formatAdminCurrency(item.revenue)}
                    </p>
                    <p className="text-sm text-stone-500">
                      {item.orders} {item.orders === 1 ? "order" : "orders"}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <p className="mt-4 text-xs leading-5 text-stone-500">
          Completed cash-on-site orders count as collected. Cash on delivery
          counts only after “mark cash collected”; online cards count only after
          capture, while external-terminal orders are recorded as card paid.
        </p>
      </AdminCard>

      <AdminCard>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-black">
              <CalendarDays className="size-5 text-amber-700" />
              Sales by weekday
            </h2>
            <p className="mt-1 text-sm text-stone-500">
              Average completed revenue for Mondays through Sundays across all
              available history for this restaurant.
            </p>
          </div>
          {analytics.bestWeekday &&
            analytics.bestWeekday.averageRevenue > 0 && (
              <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                Strongest weekday:{" "}
                <strong>{analytics.bestWeekday.label}</strong> ·{" "}
                {formatAdminCurrency(analytics.bestWeekday.averageRevenue)} avg.
              </p>
            )}
        </div>
        <WeekdaySalesChart data={analytics.weekday} />
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-lg text-left text-sm">
            <thead>
              <tr className="border-b border-stone-200 text-stone-500">
                <th className="py-3 font-semibold">Weekday</th>
                <th className="py-3 text-right font-semibold">Orders</th>
                <th className="py-3 text-right font-semibold">Total revenue</th>
                <th className="py-3 text-right font-semibold">Average day</th>
              </tr>
            </thead>
            <tbody>
              {analytics.weekday.map((day) => (
                <tr key={day.key} className="border-b border-stone-100">
                  <td className="py-3 font-medium">{day.label}</td>
                  <td className="py-3 text-right text-stone-600">
                    {day.orders}
                  </td>
                  <td className="py-3 text-right font-bold">
                    {formatAdminCurrency(day.revenue)}
                  </td>
                  <td className="py-3 text-right font-bold">
                    {formatAdminCurrency(day.averageRevenue)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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

function WeekdaySalesChart({ data }: { data: WeekdayTotal[] }) {
  return (
    <div className="mt-7 h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 10, right: 12, left: 4, bottom: 0 }}
          accessibilityLayer
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={64}
            tickFormatter={(value) => `€${value}`}
          />
          <Tooltip
            formatter={(value, name) => [
              name === "averageRevenue"
                ? formatAdminCurrency(Number(value))
                : Number(value).toFixed(1),
              name === "averageRevenue"
                ? "Average revenue"
                : "Average orders",
            ]}
          />
          <Bar
            dataKey="averageRevenue"
            fill="#b45309"
            radius={[6, 6, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function PaymentMixChart({ data }: { data: PaymentTotal[] }) {
  const paidData = data.filter((item) => item.revenue > 0);

  if (paidData.length === 0) {
    return (
      <div className="grid min-h-64 place-items-center rounded-xl bg-stone-50 text-sm text-stone-500">
        No completed sales in this period.
      </div>
    );
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart accessibilityLayer>
          <Pie
            data={paidData}
            dataKey="revenue"
            nameKey="label"
            innerRadius="52%"
            outerRadius="78%"
            paddingAngle={2}
          >
            {paidData.map((item) => (
              <Cell key={item.key} fill={item.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) => [
              formatAdminCurrency(Number(value)),
              "Revenue",
            ]}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

function WorkloadHeatmap({ data }: { data: WorkloadCell[] }) {
  const maximum = Math.max(...data.map((cell) => cell.averageOrders), 0);
  const byWeekday = new Map(
    weekdayLabels.map(([key]) => [
      key,
      data.filter((cell) => cell.weekday === key),
    ]),
  );

  return (
    <div className="mt-6 overflow-x-auto pb-2">
      <div className="min-w-[58rem]">
        <div className="grid grid-cols-[5.5rem_repeat(24,minmax(1.75rem,1fr))] gap-1">
          <span />
          {Array.from({ length: 24 }, (_, hour) => (
            <span
              key={hour}
              className="pb-1 text-center text-[10px] font-semibold text-stone-500"
            >
              {hour % 2 === 0 ? String(hour).padStart(2, "0") : ""}
            </span>
          ))}
          {weekdayLabels.map(([key, label]) => (
            <HeatmapRow
              key={key}
              label={label}
              cells={byWeekday.get(key) ?? []}
              maximum={maximum}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function HeatmapRow({
  label,
  cells,
  maximum,
}: {
  label: string;
  cells: WorkloadCell[];
  maximum: number;
}) {
  return (
    <>
      <span className="self-center pr-2 text-sm font-semibold text-stone-600">
        {label}
      </span>
      {cells.map((cell) => {
        const intensity =
          maximum === 0 ? 0 : Math.max(0.08, cell.averageOrders / maximum);
        const details = `${label} ${formatHour(cell.hour)}: ${cell.averageOrders.toFixed(
          1,
        )} average orders, ${cell.orders} total orders, ${formatAdminCurrency(
          cell.revenue,
        )} revenue`;
        return (
          <span
            key={cell.key}
            tabIndex={0}
            aria-label={details}
            title={details}
            className="aspect-square rounded-sm outline-none ring-amber-500 transition hover:scale-110 focus:ring-2"
            style={{
              backgroundColor:
                cell.orders === 0
                  ? "#f5f5f4"
                  : `color-mix(in srgb, #b45309 ${Math.round(
                      intensity * 100,
                    )}%, #fef3c7)`,
            }}
          />
        );
      })}
    </>
  );
}

function formatHour(hour: number) {
  return `${String(hour).padStart(2, "0")}:00–${String(
    (hour + 1) % 24,
  ).padStart(2, "0")}:00`;
}
