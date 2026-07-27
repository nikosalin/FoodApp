"use client";

import { MapPin, Plus, Save, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import type { DeliverySettings, DeliveryZone } from "../types";

export function RestaurantDeliverySettingsCard({
  restaurantId,
}: {
  restaurantId: string;
}) {
  const [settings, setSettings] = useState<DeliverySettings>();
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    void requestSettings(restaurantId).then((value) => {
      setSettings(value);
      setZones(value.zones);
    });
  }, [restaurantId]);

  async function save(refreshRestaurantCoordinates = false) {
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const value = await requestSettings(restaurantId, {
        zones,
        refreshRestaurantCoordinates,
      });
      setSettings(value);
      setZones(value.zones);
      setSuccess(
        refreshRestaurantCoordinates
          ? "Restaurant location and delivery zones saved."
          : "Delivery zones saved.",
      );
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to save zones");
    } finally {
      setBusy(false);
    }
  }

  if (!settings) {
    return (
      <section className="rounded-2xl border border-stone-200 bg-white p-5">
        Loading delivery settings…
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-stone-500">
            Delivery radius
          </p>
          <h2 className="mt-2 text-xl font-black">Distance-based minimums</h2>
          <p className="mt-1 text-sm text-stone-500">
            {settings.restaurantAddress}
          </p>
          <p
            className={`mt-2 text-xs font-bold ${
              settings.coordinatesConfigured
                ? "text-emerald-700"
                : "text-amber-700"
            }`}
          >
            {settings.coordinatesConfigured
              ? "Restaurant coordinates configured"
              : "Geocode the restaurant before accepting delivery orders"}
          </p>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => void save(true)}
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-stone-300 px-3 text-sm font-bold"
        >
          <MapPin className="size-4" />
          Geocode shop address
        </button>
      </div>

      <div className="mt-5 overflow-x-auto">
        <div className="min-w-[42rem] space-y-2">
          <div className="grid grid-cols-[1fr_1fr_1fr_auto_auto] gap-2 px-2 text-xs font-bold uppercase tracking-wide text-stone-500">
            <span>Up to km</span>
            <span>Minimum €</span>
            <span>Delivery fee €</span>
            <span>Active</span>
            <span className="w-9" />
          </div>
          {zones.map((zone, index) => (
            <div
              key={zone.id}
              className="grid grid-cols-[1fr_1fr_1fr_auto_auto] items-center gap-2"
            >
              <NumberInput
                value={zone.maxDistanceMeters / 1000}
                step={0.5}
                onChange={(value) =>
                  updateZone(index, {
                    maxDistanceMeters: Math.round(value * 1000),
                  })
                }
              />
              <NumberInput
                value={zone.minimumOrder}
                step={1}
                onChange={(value) => updateZone(index, { minimumOrder: value })}
              />
              <NumberInput
                value={zone.deliveryFee}
                step={0.5}
                onChange={(value) => updateZone(index, { deliveryFee: value })}
              />
              <input
                type="checkbox"
                className="size-5"
                checked={zone.active}
                onChange={(event) =>
                  updateZone(index, { active: event.target.checked })
                }
                aria-label={`Zone ${index + 1} active`}
              />
              <button
                type="button"
                className="grid size-9 place-items-center rounded-lg text-red-700 hover:bg-red-50"
                onClick={() =>
                  setZones((current) =>
                    current.filter((_, zoneIndex) => zoneIndex !== index),
                  )
                }
                aria-label={`Delete zone ${index + 1}`}
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy || zones.length >= 10}
          onClick={() =>
            setZones((current) => [
              ...current,
              {
                id: `new-${crypto.randomUUID()}`,
                maxDistanceMeters:
                  (current.at(-1)?.maxDistanceMeters ?? 0) + 3000,
                minimumOrder: (current.at(-1)?.minimumOrder ?? 10) + 10,
                deliveryFee: current.at(-1)?.deliveryFee ?? 3,
                active: true,
              },
            ])
          }
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-stone-300 px-3 text-sm font-bold"
        >
          <Plus className="size-4" />
          Add zone
        </button>
        <button
          type="button"
          disabled={busy || zones.length === 0}
          onClick={() => void save(false)}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-stone-950 px-4 text-sm font-bold text-white"
        >
          <Save className="size-4" />
          Save delivery zones
        </button>
      </div>
      {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
      {success && <p className="mt-3 text-sm text-emerald-700">{success}</p>}
    </section>
  );

  function updateZone(index: number, changes: Partial<DeliveryZone>) {
    setZones((current) =>
      current.map((zone, zoneIndex) =>
        zoneIndex === index ? { ...zone, ...changes } : zone,
      ),
    );
  }
}

function NumberInput({
  value,
  step,
  onChange,
}: {
  value: number;
  step: number;
  onChange: (value: number) => void;
}) {
  return (
    <input
      type="number"
      min="0"
      step={step}
      value={value}
      onChange={(event) => onChange(Number(event.target.value))}
      className="h-10 rounded-lg border border-stone-300 px-2"
    />
  );
}

async function requestSettings(
  restaurantId: string,
  body?: Record<string, unknown>,
) {
  const response = await fetch(
    `/api/admin/restaurants/${encodeURIComponent(
      restaurantId,
    )}/delivery-settings`,
    {
      method: body ? "PUT" : "GET",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      credentials: "same-origin",
      cache: "no-store",
    },
  );
  const result = (await response.json()) as {
    settings?: DeliverySettings;
    error?: string;
  };
  if (!response.ok || !result.settings) {
    throw new Error(result.error ?? "Unable to load delivery settings");
  }
  return result.settings;
}
