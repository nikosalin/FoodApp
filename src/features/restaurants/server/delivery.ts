import "server-only";

import type { DeliveryAddress } from "@/features/admin/types";
import type {
  DeliveryQuote,
  DeliverySettings,
  DeliveryZone,
} from "../types";
import { getAdminSupabase, isSupabaseConfigured } from "@/lib/supabase/admin";
import { databaseRestaurantId } from "@/features/orders/server/supabase-order-repository";
import { seedAdminState } from "@/features/admin/data/seed";
import type { TableRow } from "@/types/database";

type Coordinates = { latitude: number; longitude: number };

export class DeliveryQuoteError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string,
  ) {
    super(message);
  }
}

const fallbackCoordinates: Record<string, Coordinates> = {
  "restaurant-1": { latitude: 52.4888, longitude: 13.3798 },
  "restaurant-2": { latitude: 52.5208, longitude: 13.4095 },
};

const fallbackZones: DeliveryZone[] = [
  {
    id: "zone-3km",
    maxDistanceMeters: 3000,
    minimumOrder: 15,
    deliveryFee: 2,
    active: true,
  },
  {
    id: "zone-6km",
    maxDistanceMeters: 6000,
    minimumOrder: 25,
    deliveryFee: 3.5,
    active: true,
  },
  {
    id: "zone-10km",
    maxDistanceMeters: 10000,
    minimumOrder: 40,
    deliveryFee: 5,
    active: true,
  },
];

export async function getDeliverySettings(
  restaurantId: string,
): Promise<DeliverySettings> {
  if (!isSupabaseConfigured()) {
    const restaurant = seedAdminState.restaurants.find(
      (item) => item.id === restaurantId,
    );
    return {
      restaurantId,
      restaurantAddress: restaurant
        ? `${restaurant.address}, ${restaurant.city}, Deutschland`
        : "",
      coordinatesConfigured: Boolean(fallbackCoordinates[restaurantId]),
      zones: structuredClone(fallbackZones),
    };
  }
  const client = requireSupabase();
  const databaseId = databaseRestaurantId(restaurantId);
  const [restaurant, zones] = await Promise.all([
    client
      .from("restaurants")
      .select("address_line, postal_code, city, latitude, longitude")
      .eq("id", databaseId)
      .maybeSingle(),
    client
      .from("restaurant_delivery_zones")
      .select("*")
      .eq("restaurant_id", databaseId)
      .order("max_distance_meters"),
  ]);
  if (restaurant.error || !restaurant.data || zones.error) {
    throw new DeliveryQuoteError(
      "Unable to load delivery settings",
      500,
      "delivery_settings_unavailable",
    );
  }
  return {
    restaurantId,
    restaurantAddress: `${restaurant.data.address_line}, ${restaurant.data.postal_code} ${restaurant.data.city}, Deutschland`,
    coordinatesConfigured:
      restaurant.data.latitude !== null && restaurant.data.longitude !== null,
    zones: zones.data.map(mapZone),
  };
}

export async function updateDeliverySettings(
  restaurantId: string,
  input: {
    zones: Omit<DeliveryZone, "id">[];
    refreshRestaurantCoordinates?: boolean;
  },
  actorUserId?: string,
) {
  validateZones(input.zones);
  if (!isSupabaseConfigured()) {
    return await getDeliverySettings(restaurantId);
  }
  const client = requireSupabase();
  const databaseId = databaseRestaurantId(restaurantId);
  const restaurant = await client
    .from("restaurants")
    .select("address_line, postal_code, city")
    .eq("id", databaseId)
    .maybeSingle();
  if (restaurant.error || !restaurant.data) {
    throw new DeliveryQuoteError("Restaurant not found", 404, "restaurant_not_found");
  }
  if (input.refreshRestaurantCoordinates) {
    const coordinates = await geocodeAddress(
      {
        street: restaurant.data.address_line,
        postalCode: restaurant.data.postal_code,
        city: restaurant.data.city,
        countryCode: "DE",
      },
      true,
    );
    const update = await client
      .from("restaurants")
      .update({
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
      })
      .eq("id", databaseId);
    if (update.error) {
      throw new DeliveryQuoteError(
        "Unable to save restaurant coordinates",
        500,
        "coordinates_not_saved",
      );
    }
  }
  const replace = await client.rpc("replace_delivery_zones", {
    p_restaurant_id: databaseId,
    p_zones: input.zones.map((zone) => ({
      max_distance_meters: zone.maxDistanceMeters,
      minimum_order_minor: Math.round(zone.minimumOrder * 100),
      delivery_fee_minor: Math.round(zone.deliveryFee * 100),
      active: zone.active,
    })),
  });
  if (replace.error) {
    throw new DeliveryQuoteError(
      "Unable to save delivery zones",
      500,
      "delivery_zones_not_saved",
    );
  }
  const auditRestaurant = await client
    .from("restaurants")
    .select("business_id")
    .eq("id", databaseId)
    .maybeSingle();
  if (auditRestaurant.error || !auditRestaurant.data) {
    throw new DeliveryQuoteError(
      "Unable to audit delivery settings",
      500,
      "delivery_audit_failed",
    );
  }
  const audit = await client.from("audit_events").insert({
    business_id: auditRestaurant.data.business_id,
    restaurant_id: databaseId,
    actor_user_id: actorUserId ?? null,
    action: "restaurant.delivery_settings_changed",
    entity_type: "restaurant",
    entity_id: databaseId,
    safe_changes: {
      zoneCount: input.zones.length,
      coordinatesRefreshed: input.refreshRestaurantCoordinates === true,
    },
  });
  if (audit.error) {
    throw new DeliveryQuoteError(
      "Unable to audit delivery settings",
      500,
      "delivery_audit_failed",
    );
  }
  return await getDeliverySettings(restaurantId);
}

export async function calculateDeliveryQuote(
  restaurantId: string,
  address: DeliveryAddress,
  subtotal: number,
): Promise<DeliveryQuote> {
  if (!Number.isFinite(subtotal) || subtotal < 0) {
    throw new DeliveryQuoteError("Invalid subtotal", 400, "invalid_subtotal");
  }
  const [origin, destination, settings] = await Promise.all([
    getRestaurantCoordinates(restaurantId),
    geocodeAddress(address, false),
    getDeliverySettings(restaurantId),
  ]);
  const distanceMeters = Math.round(haversineMeters(origin, destination));
  const zone = settings.zones
    .filter((item) => item.active)
    .sort((first, second) => first.maxDistanceMeters - second.maxDistanceMeters)
    .find((item) => distanceMeters <= item.maxDistanceMeters);
  if (!zone) {
    throw new DeliveryQuoteError(
      "The address is outside this restaurant's delivery area",
      422,
      "outside_delivery_area",
    );
  }
  return {
    zoneId: zone.id,
    distanceMeters,
    minimumOrder: zone.minimumOrder,
    deliveryFee: zone.deliveryFee,
    subtotal,
    total: subtotal + zone.deliveryFee,
    minimumMet: subtotal >= zone.minimumOrder,
  };
}

async function getRestaurantCoordinates(
  restaurantId: string,
): Promise<Coordinates> {
  if (!isSupabaseConfigured()) {
    const coordinates = fallbackCoordinates[restaurantId];
    if (coordinates) return coordinates;
    throw new DeliveryQuoteError(
      "Restaurant delivery location is not configured",
      409,
      "restaurant_coordinates_missing",
    );
  }
  const client = requireSupabase();
  const restaurant = await client
    .from("restaurants")
    .select("latitude, longitude")
    .eq("id", databaseRestaurantId(restaurantId))
    .maybeSingle();
  if (
    restaurant.error ||
    !restaurant.data ||
    restaurant.data.latitude === null ||
    restaurant.data.longitude === null
  ) {
    throw new DeliveryQuoteError(
      "Restaurant delivery location is not configured",
      409,
      "restaurant_coordinates_missing",
    );
  }
  return {
    latitude: restaurant.data.latitude,
    longitude: restaurant.data.longitude,
  };
}

async function geocodeAddress(
  address: DeliveryAddress,
  permanent: boolean,
): Promise<Coordinates> {
  const accessToken = process.env.MAPBOX_ACCESS_TOKEN?.trim();
  if (!accessToken) {
    throw new DeliveryQuoteError(
      "Address lookup is not configured",
      503,
      "geocoding_not_configured",
    );
  }
  const parameters = new URLSearchParams({
    address_line1: address.street,
    postcode: address.postalCode,
    place: address.city,
    country: "DE",
    language: "de",
    autocomplete: "false",
    types: "address",
    limit: "1",
    permanent: String(permanent),
    access_token: accessToken,
  });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  try {
    const response = await fetch(
      `https://api.mapbox.com/search/geocode/v6/forward?${parameters}`,
      { signal: controller.signal, cache: "no-store" },
    );
    if (!response.ok) {
      throw new DeliveryQuoteError(
        "Address lookup is temporarily unavailable",
        503,
        `geocoding_http_${response.status}`,
      );
    }
    const body = (await response.json()) as {
      features?: { geometry?: { coordinates?: unknown } }[];
    };
    const coordinates = body.features?.[0]?.geometry?.coordinates;
    if (
      !Array.isArray(coordinates) ||
      coordinates.length < 2 ||
      typeof coordinates[0] !== "number" ||
      typeof coordinates[1] !== "number"
    ) {
      throw new DeliveryQuoteError(
        "The delivery address could not be found",
        422,
        "address_not_found",
      );
    }
    return { longitude: coordinates[0], latitude: coordinates[1] };
  } catch (error) {
    if (error instanceof DeliveryQuoteError) throw error;
    throw new DeliveryQuoteError(
      "Address lookup is temporarily unavailable",
      503,
      "geocoding_unavailable",
    );
  } finally {
    clearTimeout(timeout);
  }
}

function validateZones(zones: Omit<DeliveryZone, "id">[]) {
  if (zones.length < 1 || zones.length > 10) {
    throw new DeliveryQuoteError(
      "Between 1 and 10 delivery zones are required",
      400,
      "invalid_delivery_zones",
    );
  }
  let previousDistance = 0;
  for (const zone of [...zones].sort(
    (first, second) => first.maxDistanceMeters - second.maxDistanceMeters,
  )) {
    if (
      !Number.isInteger(zone.maxDistanceMeters) ||
      zone.maxDistanceMeters <= previousDistance ||
      zone.maxDistanceMeters > 100_000 ||
      !Number.isFinite(zone.minimumOrder) ||
      zone.minimumOrder < 0 ||
      zone.minimumOrder > 10_000 ||
      !Number.isFinite(zone.deliveryFee) ||
      zone.deliveryFee < 0 ||
      zone.deliveryFee > 1_000
    ) {
      throw new DeliveryQuoteError(
        "Invalid delivery-zone values",
        400,
        "invalid_delivery_zones",
      );
    }
    previousDistance = zone.maxDistanceMeters;
  }
}

function mapZone(row: TableRow<"restaurant_delivery_zones">): DeliveryZone {
  return {
    id: row.id,
    maxDistanceMeters: row.max_distance_meters,
    minimumOrder: row.minimum_order_minor / 100,
    deliveryFee: row.delivery_fee_minor / 100,
    active: row.active,
  };
}

function haversineMeters(first: Coordinates, second: Coordinates) {
  const radius = 6_371_000;
  const latitudeDelta = radians(second.latitude - first.latitude);
  const longitudeDelta = radians(second.longitude - first.longitude);
  const firstLatitude = radians(first.latitude);
  const secondLatitude = radians(second.latitude);
  const value =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(firstLatitude) *
      Math.cos(secondLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;
  return radius * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

function radians(value: number) {
  return (value * Math.PI) / 180;
}

function requireSupabase() {
  const client = getAdminSupabase();
  if (!client) {
    throw new DeliveryQuoteError(
      "Supabase is not configured",
      503,
      "supabase_not_configured",
    );
  }
  return client;
}
