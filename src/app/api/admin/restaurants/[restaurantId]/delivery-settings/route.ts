import { NextRequest, NextResponse } from "next/server";
import { authorizeRestaurant, parseSmallJson } from "@/features/orders/server/api";
import {
  DeliveryQuoteError,
  getDeliverySettings,
  updateDeliverySettings,
} from "@/features/restaurants/server/delivery";
import type { DeliveryZone } from "@/features/restaurants/types";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ restaurantId: string }> },
) {
  const { restaurantId } = await params;
  const authorization = await authorizeRestaurant(request, restaurantId);
  if (authorization.error) return authorization.error;
  try {
    return NextResponse.json({
      settings: await getDeliverySettings(restaurantId),
    });
  } catch (error) {
    return deliveryError(error);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ restaurantId: string }> },
) {
  const { restaurantId } = await params;
  const authorization = await authorizeRestaurant(request, restaurantId, true);
  if (authorization.error) return authorization.error;
  try {
    const body = await parseSmallJson(request);
    if (!Array.isArray(body.zones)) {
      return NextResponse.json({ error: "Delivery zones are required" }, { status: 400 });
    }
    const zones = body.zones.map((value): Omit<DeliveryZone, "id"> => {
      if (!value || typeof value !== "object") {
        throw new DeliveryQuoteError("Invalid delivery zone", 400, "invalid_delivery_zone");
      }
      const zone = value as Record<string, unknown>;
      return {
        maxDistanceMeters: Number(zone.maxDistanceMeters),
        minimumOrder: Number(zone.minimumOrder),
        deliveryFee: Number(zone.deliveryFee),
        active: zone.active !== false,
      };
    });
    return NextResponse.json({
      settings: await updateDeliverySettings(restaurantId, {
        zones,
        refreshRestaurantCoordinates:
          body.refreshRestaurantCoordinates === true,
      }, authorization.session.sub),
    });
  } catch (error) {
    return deliveryError(error);
  }
}

function deliveryError(error: unknown) {
  if (error instanceof DeliveryQuoteError) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.status },
    );
  }
  return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
}
