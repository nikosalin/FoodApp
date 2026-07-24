import "server-only";

import { NextRequest, NextResponse } from "next/server";
import {
  canAccessRestaurant,
  hasValidOrigin,
  readSession,
} from "./auth";
import {
  OrderRepositoryError,
  updateOrderStatus,
} from "./order-repository";
import type { OrderStatus } from "@/features/admin/types";
import type { OrderInput } from "@/features/admin/types";
import { getMenuForRestaurantId } from "@/features/menu/data/menu";

export function authorizeRestaurant(
  request: NextRequest,
  restaurantId: string,
  mutation = false,
) {
  const session = readSession(request);
  if (!session) {
    return {
      error: NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      ),
    };
  }
  if (!canAccessRestaurant(session, restaurantId)) {
    return {
      error: NextResponse.json({ error: "Access denied" }, { status: 403 }),
    };
  }
  if (mutation && !hasValidOrigin(request)) {
    return {
      error: NextResponse.json(
        { error: "Invalid request origin" },
        { status: 403 },
      ),
    };
  }
  return { session };
}

export async function parseSmallJson(request: NextRequest) {
  const contentType = request.headers.get("content-type") ?? "";
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (!contentType.includes("application/json") || contentLength > 4096) {
    throw new OrderRepositoryError("Invalid request body", 400);
  }
  try {
    return (await request.json()) as Record<string, unknown>;
  } catch {
    throw new OrderRepositoryError("Malformed JSON body", 400);
  }
}

export function mutationResponse(action: () => unknown) {
  try {
    return NextResponse.json({ order: action() });
  } catch (error) {
    if (error instanceof OrderRepositoryError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
  }
}

export function changeStatus(input: {
  restaurantId: string;
  orderId: string;
  status: OrderStatus;
  rejectionReason?: string;
}) {
  return mutationResponse(() => updateOrderStatus(input));
}

export function validateOrderInput(
  body: Record<string, unknown>,
  restaurantId: string,
): OrderInput {
  const customerName =
    typeof body.customerName === "string" ? body.customerName.trim() : "";
  const customerEmail =
    typeof body.customerEmail === "string"
      ? body.customerEmail.trim().toLowerCase()
      : "";
  const customerPhone =
    typeof body.customerPhone === "string" ? body.customerPhone.trim() : "";
  const preferredChannel = body.preferredChannel;
  const orderType = body.orderType;

  if (customerName.length < 2 || customerName.length > 100) {
    throw new OrderRepositoryError(
      "Customer name must be between 2 and 100 characters",
      400,
    );
  }
  if (!customerEmail && !customerPhone) {
    throw new OrderRepositoryError("Email or phone number is required", 400);
  }
  if (
    customerEmail &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)
  ) {
    throw new OrderRepositoryError("Invalid email address", 400);
  }
  if (
    customerPhone &&
    !/^\+?[0-9 ()-]{7,24}$/.test(customerPhone)
  ) {
    throw new OrderRepositoryError("Invalid phone number", 400);
  }
  if (
    preferredChannel !== "email" &&
    preferredChannel !== "sms"
  ) {
    throw new OrderRepositoryError("Invalid notification channel", 400);
  }
  if (
    (preferredChannel === "email" && !customerEmail) ||
    (preferredChannel === "sms" && !customerPhone)
  ) {
    throw new OrderRepositoryError(
      `A ${preferredChannel} contact is required for the selected channel`,
      400,
    );
  }
  if (
    orderType !== "table" &&
    orderType !== "takeaway" &&
    orderType !== "delivery"
  ) {
    throw new OrderRepositoryError("Invalid order type", 400);
  }
  if (!Array.isArray(body.items) || body.items.length < 1 || body.items.length > 50) {
    throw new OrderRepositoryError("Between 1 and 50 order items are required", 400);
  }
  const restaurantMenu = getMenuForRestaurantId(restaurantId);
  const items = body.items.map((candidate) => {
    if (!candidate || typeof candidate !== "object") {
      throw new OrderRepositoryError("Invalid order item", 400);
    }
    const item = candidate as Record<string, unknown>;
    const menuItemId =
      typeof item.menuItemId === "string" ? item.menuItemId.trim() : "";
    const menuItem = restaurantMenu.find(
      (candidate) => candidate.id === menuItemId,
    );
    const quantity = Number(item.quantity);
    if (
      !menuItem ||
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > 99
    ) {
      throw new OrderRepositoryError(
        "Every order item must be selected from this restaurant's menu",
        400,
      );
    }
    return {
      menuItemId: menuItem.id,
      name: menuItem.name,
      quantity,
      unitPrice: menuItem.price,
    };
  });

  return {
    restaurantId,
    customerName,
    customerEmail: customerEmail || undefined,
    customerPhone: customerPhone || undefined,
    preferredChannel,
    orderType,
    tableNumber:
      typeof body.tableNumber === "string" ? body.tableNumber : undefined,
    items,
  };
}
