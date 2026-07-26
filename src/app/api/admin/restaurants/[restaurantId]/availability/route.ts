import { NextRequest, NextResponse } from "next/server";
import { authorizeRestaurant, parseSmallJson } from "@/features/orders/server/api";
import { OrderRepositoryError } from "@/features/orders/server/order-repository";
import {
  getRestaurantAvailability,
  recordAvailabilityAudit,
  updateRestaurantAvailability,
} from "@/features/restaurants/server/availability";
import type {
  OrderingOverride,
  Weekday,
  WeeklyOpeningHours,
} from "@/features/restaurants/types";

const weekdays: Weekday[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];
const timePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ restaurantId: string }> },
) {
  const { restaurantId } = await params;
  const authorization = authorizeRestaurant(request, restaurantId);
  if (authorization.error) return authorization.error;
  return NextResponse.json({
    availability: await getRestaurantAvailability(restaurantId),
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ restaurantId: string }> },
) {
  const { restaurantId } = await params;
  const authorization = authorizeRestaurant(request, restaurantId, true);
  if (authorization.error) return authorization.error;

  try {
    const body = await parseSmallJson(request);
    const weeklyHours = parseWeeklyHours(body.weeklyHours);
    const override = parseOverride(body.override);
    const cashOnDeliveryEnabled =
      typeof body.cashOnDeliveryEnabled === "boolean"
        ? body.cashOnDeliveryEnabled
        : undefined;
    if (
      weeklyHours === undefined &&
      override === undefined &&
      cashOnDeliveryEnabled === undefined
    ) {
      return NextResponse.json({ error: "No availability change supplied" }, { status: 400 });
    }
    const availability = await updateRestaurantAvailability(restaurantId, {
        weeklyHours,
        override,
        cashOnDeliveryEnabled,
      });
    await recordAvailabilityAudit(restaurantId, authorization.session.sub, {
      scheduleChanged: weeklyHours !== undefined,
      overrideChanged: override !== undefined,
      cashOnDeliveryChanged: cashOnDeliveryEnabled !== undefined,
    });
    return NextResponse.json({ availability });
  } catch (error) {
    if (error instanceof OrderRepositoryError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Invalid availability settings" }, { status: 400 });
  }
}

function parseOverride(value: unknown): OrderingOverride | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (!value || typeof value !== "object") {
    throw new Error("Invalid override");
  }
  const candidate = value as Record<string, unknown>;
  if (candidate.mode !== "open" && candidate.mode !== "closed") {
    throw new Error("Invalid mode");
  }
  const until =
    typeof candidate.until === "string" && candidate.until
      ? new Date(candidate.until)
      : undefined;
  if (until && (!Number.isFinite(until.getTime()) || until <= new Date())) {
    throw new Error("Invalid override expiry");
  }
  const reason =
    typeof candidate.reason === "string" ? candidate.reason.trim() : undefined;
  if (reason && reason.length > 160) throw new Error("Reason too long");
  return {
    mode: candidate.mode,
    until: until?.toISOString(),
    reason: reason || undefined,
  };
}

function parseWeeklyHours(value: unknown): WeeklyOpeningHours | undefined {
  if (value === undefined) return undefined;
  if (!value || typeof value !== "object") throw new Error("Invalid schedule");
  const input = value as Record<string, unknown>;
  const result = {} as WeeklyOpeningHours;
  for (const day of weekdays) {
    const window = input[day];
    if (!window || typeof window !== "object") throw new Error("Missing day");
    const candidate = window as Record<string, unknown>;
    if (
      typeof candidate.opensAt !== "string" ||
      typeof candidate.closesAt !== "string" ||
      !timePattern.test(candidate.opensAt) ||
      !timePattern.test(candidate.closesAt)
    ) {
      throw new Error("Invalid hours");
    }
    result[day] = {
      opensAt: candidate.opensAt,
      closesAt: candidate.closesAt,
      closed: candidate.closed === true,
    };
  }
  return result;
}
