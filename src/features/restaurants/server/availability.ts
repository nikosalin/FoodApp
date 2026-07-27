import "server-only";

import { seedAdminState } from "@/features/admin/data/seed";
import type {
  OrderingOverride,
  RestaurantAvailability,
  Weekday,
  WeeklyOpeningHours,
} from "../types";
import { getAdminSupabase, isSupabaseConfigured } from "@/lib/supabase/admin";
import { databaseRestaurantId } from "@/features/orders/server/supabase-order-repository";

const weekdays: Weekday[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

const defaultHours = Object.fromEntries(
  weekdays.map((day) => [
    day,
    { opensAt: "12:00", closesAt: "22:00", closed: false },
  ]),
) as WeeklyOpeningHours;

type AvailabilityMemory = Map<
  string,
  {
    weeklyHours: WeeklyOpeningHours;
    override?: OrderingOverride;
    cashOnDeliveryEnabled: boolean;
  }
>;

const globalAvailability = globalThis as typeof globalThis & {
  __foodappAvailability?: AvailabilityMemory;
};

function memory() {
  globalAvailability.__foodappAvailability ??= new Map();
  return globalAvailability.__foodappAvailability;
}

function settings(restaurantId: string) {
  const existing = memory().get(restaurantId);
  if (existing) return existing;
  const created: {
    weeklyHours: WeeklyOpeningHours;
    override?: OrderingOverride;
    cashOnDeliveryEnabled: boolean;
  } = {
    weeklyHours: structuredClone(defaultHours),
    cashOnDeliveryEnabled: restaurantId === "restaurant-1",
  };
  memory().set(restaurantId, created);
  return created;
}

export async function getRestaurantAvailability(
  restaurantId: string,
  now = new Date(),
): Promise<RestaurantAvailability> {
  let restaurantStatus =
    seedAdminState.restaurants.find((candidate) => candidate.id === restaurantId)
      ?.status ?? "blocked";
  let current = settings(restaurantId);
  if (isSupabaseConfigured()) {
    const client = requireSupabase();
    const databaseId = databaseRestaurantId(restaurantId);
    const [restaurantResult, hoursResult] = await Promise.all([
      client
        .from("restaurants")
        .select("status, accepts_cash_on_delivery, ordering_override_mode, ordering_override_until, ordering_override_reason")
        .eq("id", databaseId)
        .maybeSingle(),
      client
        .from("restaurant_opening_hours")
        .select("day_of_week, opens_at, closes_at, closed")
        .eq("restaurant_id", databaseId),
    ]);
    if (restaurantResult.error || !restaurantResult.data || hoursResult.error) {
      throw new Error("Unable to load restaurant availability");
    }
    restaurantStatus = restaurantResult.data.status;
    const weeklyHours = structuredClone(defaultHours);
    for (const row of hoursResult.data) {
      const day = weekdays[row.day_of_week];
      weeklyHours[day] = {
        opensAt: row.opens_at.slice(0, 5),
        closesAt: row.closes_at.slice(0, 5),
        closed: row.closed,
      };
    }
    current = {
      weeklyHours,
      cashOnDeliveryEnabled:
        restaurantResult.data.accepts_cash_on_delivery,
      override: restaurantResult.data.ordering_override_mode
        ? {
            mode: restaurantResult.data.ordering_override_mode,
            until: restaurantResult.data.ordering_override_until ?? undefined,
            reason: restaurantResult.data.ordering_override_reason ?? undefined,
          }
        : undefined,
    };
  }
  const activeOverride =
    current.override &&
    (!current.override.until ||
      new Date(current.override.until).getTime() > now.getTime())
      ? current.override
      : undefined;
  if (current.override && !activeOverride) {
    current.override = undefined;
  }

  if (restaurantStatus === "blocked") {
    return result(restaurantId, false, "restaurant_blocked", "Ordering is unavailable.", current);
  }
  if (activeOverride) {
    return result(
      restaurantId,
      activeOverride.mode === "open",
      "override",
      activeOverride.reason ??
        (activeOverride.mode === "open"
          ? "The restaurant is accepting orders."
          : "The restaurant closed ordering temporarily."),
      current,
      activeOverride,
    );
  }

  const local = berlinParts(now);
  const window = current.weeklyHours[local.weekday];
  const currentMinutes = local.hour * 60 + local.minute;
  const opens = timeToMinutes(window.opensAt);
  const closes = timeToMinutes(window.closesAt);
  const open =
    !window.closed &&
    (closes > opens
      ? currentMinutes >= opens && currentMinutes < closes
      : currentMinutes >= opens || currentMinutes < closes);
  return result(
    restaurantId,
    open,
    "schedule",
    open
      ? `Accepting orders until ${window.closesAt}.`
      : `Currently closed. Regular hours today: ${window.opensAt}–${window.closesAt}.`,
    current,
  );
}

export async function updateRestaurantAvailability(
  restaurantId: string,
  input: {
    weeklyHours?: WeeklyOpeningHours;
    override?: OrderingOverride | null;
    cashOnDeliveryEnabled?: boolean;
  },
) {
  if (isSupabaseConfigured()) {
    const client = requireSupabase();
    const databaseId = databaseRestaurantId(restaurantId);
    if (input.override !== undefined) {
      const override = input.override;
      const result = await client
        .from("restaurants")
        .update({
          ordering_override_mode: override?.mode ?? null,
          ordering_override_until: override?.until ?? null,
          ordering_override_reason: override?.reason ?? null,
        })
        .eq("id", databaseId);
      if (result.error) throw new Error("Unable to save ordering override");
    }
    if (input.cashOnDeliveryEnabled !== undefined) {
      const result = await client
        .from("restaurants")
        .update({
          accepts_cash_on_delivery: input.cashOnDeliveryEnabled,
        })
        .eq("id", databaseId);
      if (result.error) {
        throw new Error("Unable to save cash-on-delivery setting");
      }
    }
    if (input.weeklyHours) {
      const rows = weekdays.map((day, dayOfWeek) => ({
        restaurant_id: databaseId,
        day_of_week: dayOfWeek,
        opens_at: input.weeklyHours![day].opensAt,
        closes_at: input.weeklyHours![day].closesAt,
        closed: input.weeklyHours![day].closed === true,
      }));
      const result = await client
        .from("restaurant_opening_hours")
        .upsert(rows, { onConflict: "restaurant_id,day_of_week" });
      if (result.error) throw new Error("Unable to save opening hours");
    }
    return await getRestaurantAvailability(restaurantId);
  }
  const current = settings(restaurantId);
  if (input.weeklyHours) current.weeklyHours = structuredClone(input.weeklyHours);
  if (input.override === null) current.override = undefined;
  else if (input.override) current.override = { ...input.override };
  if (input.cashOnDeliveryEnabled !== undefined) {
    current.cashOnDeliveryEnabled = input.cashOnDeliveryEnabled;
  }
  memory().set(restaurantId, current);
  return await getRestaurantAvailability(restaurantId);
}

export async function recordAvailabilityAudit(
  restaurantId: string,
  actorUserId: string,
  changes: {
    scheduleChanged: boolean;
    overrideChanged: boolean;
    cashOnDeliveryChanged: boolean;
  },
) {
  if (!isSupabaseConfigured()) return;
  const client = requireSupabase();
  const databaseId = databaseRestaurantId(restaurantId);
  const restaurant = await client
    .from("restaurants")
    .select("business_id")
    .eq("id", databaseId)
    .maybeSingle();
  if (restaurant.error || !restaurant.data) {
    throw new Error("Unable to audit availability change");
  }
  const audit = await client.from("audit_events").insert({
    business_id: restaurant.data.business_id,
    restaurant_id: databaseId,
    actor_user_id: actorUserId,
    action: "restaurant.availability_changed",
    entity_type: "restaurant",
    entity_id: databaseId,
    safe_changes: changes,
  });
  if (audit.error) throw new Error("Unable to audit availability change");
}

function result(
  restaurantId: string,
  acceptingOrders: boolean,
  source: RestaurantAvailability["source"],
  message: string,
  current: ReturnType<typeof settings>,
  override?: OrderingOverride,
): RestaurantAvailability {
  return {
    restaurantId,
    timezone: "Europe/Berlin",
    acceptingOrders,
    cashOnDeliveryEnabled: current.cashOnDeliveryEnabled,
    source,
    message,
    weeklyHours: structuredClone(current.weeklyHours),
    override: override ? { ...override } : undefined,
  };
}

function berlinParts(date: Date) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Berlin",
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const parts = Object.fromEntries(
    formatter.formatToParts(date).map((part) => [part.type, part.value]),
  );
  return {
    weekday: parts.weekday.toLowerCase() as Weekday,
    hour: Number(parts.hour),
    minute: Number(parts.minute),
  };
}

function timeToMinutes(value: string) {
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

function requireSupabase() {
  const client = getAdminSupabase();
  if (!client) throw new Error("Supabase is not configured");
  return client;
}
