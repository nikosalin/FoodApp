"use client";

import { Clock3, LockKeyhole, Power, Save } from "lucide-react";
import { useEffect, useState } from "react";
import type {
  RestaurantAvailability,
  Weekday,
  WeeklyOpeningHours,
} from "../types";

const weekdays: Weekday[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

export function RestaurantAvailabilityCard({
  restaurantId,
}: {
  restaurantId: string;
}) {
  const [availability, setAvailability] = useState<RestaurantAvailability>();
  const [hours, setHours] = useState<WeeklyOpeningHours>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void requestAvailability(restaurantId).then((value) => {
      setAvailability(value);
      setHours(value.weeklyHours);
    });
  }, [restaurantId]);

  async function update(body: Record<string, unknown>) {
    setBusy(true);
    setError("");
    try {
      const value = await requestAvailability(restaurantId, body);
      setAvailability(value);
      setHours(value.weeklyHours);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }

  if (!availability || !hours) {
    return (
      <section className="rounded-2xl border border-stone-200 bg-white p-5">
        Loading ordering availability…
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-stone-500">
            Online ordering
          </p>
          <div className="mt-2 flex items-center gap-2">
            <span
              className={`size-3 rounded-full ${
                availability.acceptingOrders ? "bg-emerald-500" : "bg-red-500"
              }`}
            />
            <h2 className="text-xl font-black">
              {availability.acceptingOrders ? "Open" : "Closed"}
            </h2>
          </div>
          <p className="mt-1 text-sm text-stone-500">{availability.message}</p>
          {availability.override && (
            <p className="mt-2 text-xs font-bold text-amber-700">
              Manual override active
              {availability.override.until
                ? ` until ${new Date(availability.override.until).toLocaleString("de-DE")}`
                : ""}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              void update({
                override: {
                  mode: "closed",
                  until: tomorrowAtNoon(),
                  reason: "Restaurant closed ordering early.",
                },
              })
            }
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-red-200 px-3 text-sm font-bold text-red-700"
          >
            <LockKeyhole className="size-4" />
            Close now
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              void update({
                override: {
                  mode: "open",
                  reason: "Restaurant opened ordering manually.",
                },
              })
            }
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-emerald-700 px-3 text-sm font-bold text-white"
          >
            <Power className="size-4" />
            Open now
          </button>
          {availability.override && (
            <button
              type="button"
              disabled={busy}
              onClick={() => void update({ override: null })}
              className="h-10 rounded-xl border border-stone-300 px-3 text-sm font-bold"
            >
              Use schedule
            </button>
          )}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-stone-50 p-4">
        <div>
          <p className="font-bold">Cash on delivery</p>
          <p className="text-sm text-stone-500">
            Let delivery customers pay the driver in cash.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={availability.cashOnDeliveryEnabled}
          disabled={busy}
          onClick={() =>
            void update({
              cashOnDeliveryEnabled:
                !availability.cashOnDeliveryEnabled,
            })
          }
          className={`rounded-full px-4 py-2 text-sm font-bold ${
            availability.cashOnDeliveryEnabled
              ? "bg-emerald-700 text-white"
              : "bg-stone-200 text-stone-700"
          }`}
        >
          {availability.cashOnDeliveryEnabled ? "Enabled" : "Disabled"}
        </button>
      </div>

      <details className="mt-5 border-t border-stone-200 pt-4">
        <summary className="flex cursor-pointer items-center gap-2 font-bold">
          <Clock3 className="size-4" />
          Weekly opening hours
        </summary>
        <div className="mt-4 space-y-2">
          {weekdays.map((day) => (
            <div
              key={day}
              className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-2 text-sm"
            >
              <span className="font-semibold capitalize">{day}</span>
              <input
                type="time"
                disabled={hours[day].closed}
                value={hours[day].opensAt}
                onChange={(event) =>
                  setHours({
                    ...hours,
                    [day]: { ...hours[day], opensAt: event.target.value },
                  })
                }
                className="h-9 rounded-lg border border-stone-300 px-2 disabled:opacity-40"
              />
              <input
                type="time"
                disabled={hours[day].closed}
                value={hours[day].closesAt}
                onChange={(event) =>
                  setHours({
                    ...hours,
                    [day]: { ...hours[day], closesAt: event.target.value },
                  })
                }
                className="h-9 rounded-lg border border-stone-300 px-2 disabled:opacity-40"
              />
              <label className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={hours[day].closed === true}
                  onChange={(event) =>
                    setHours({
                      ...hours,
                      [day]: { ...hours[day], closed: event.target.checked },
                    })
                  }
                />
                Closed
              </label>
            </div>
          ))}
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => void update({ weeklyHours: hours })}
          className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-stone-950 px-4 text-sm font-bold text-white"
        >
          <Save className="size-4" />
          Save hours
        </button>
      </details>
      {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
    </section>
  );
}

async function requestAvailability(
  restaurantId: string,
  body?: Record<string, unknown>,
) {
  const response = await fetch(
    `/api/admin/restaurants/${encodeURIComponent(restaurantId)}/availability`,
    {
      method: body ? "PATCH" : "GET",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      credentials: "same-origin",
      cache: "no-store",
    },
  );
  const result = (await response.json()) as {
    availability?: RestaurantAvailability;
    error?: string;
  };
  if (!response.ok || !result.availability) {
    throw new Error(result.error ?? "Unable to update ordering availability");
  }
  return result.availability;
}

function tomorrowAtNoon() {
  const value = new Date();
  value.setDate(value.getDate() + 1);
  value.setHours(12, 0, 0, 0);
  return value.toISOString();
}
