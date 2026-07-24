import { NextRequest } from "next/server";
import {
  authorizeRestaurant,
  changeStatus,
} from "@/features/orders/server/api";

export async function POST(
  request: NextRequest,
  {
    params,
  }: { params: Promise<{ restaurantId: string; orderId: string }> },
) {
  const { restaurantId, orderId } = await params;
  const authorization = authorizeRestaurant(request, restaurantId, true);
  if (authorization.error) return authorization.error;
  return changeStatus({ restaurantId, orderId, status: "accepted" });
}
