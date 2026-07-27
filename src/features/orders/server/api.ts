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
  const paymentMethod = body.paymentMethod;
  const onlinePaymentProvider = body.onlinePaymentProvider;

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
  if (
    paymentMethod !== "online" &&
    paymentMethod !== "cash_on_site" &&
    paymentMethod !== "cash_on_delivery" &&
    paymentMethod !== "external_card"
  ) {
    throw new OrderRepositoryError("Invalid payment method", 400);
  }
  if (
    paymentMethod === "online" &&
    onlinePaymentProvider !== undefined &&
    onlinePaymentProvider !== "stripe" &&
    onlinePaymentProvider !== "paypal"
  ) {
    throw new OrderRepositoryError("Invalid online payment provider", 400);
  }
  if (orderType === "delivery" && paymentMethod === "cash_on_site") {
    throw new OrderRepositoryError(
      "Cash on site is only available for dine-in or pickup orders",
      400,
    );
  }
  if (paymentMethod === "cash_on_delivery" && orderType !== "delivery") {
    throw new OrderRepositoryError(
      "Cash on delivery is only available for delivery orders",
      400,
    );
  }
  if (paymentMethod === "cash_on_delivery" && !customerPhone) {
    throw new OrderRepositoryError(
      "A phone number is required for cash on delivery",
      400,
    );
  }
  const deliveryAddress =
    orderType === "delivery"
      ? validateDeliveryAddress(body.deliveryAddress)
      : undefined;
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
    paymentMethod,
    onlinePaymentProvider:
      paymentMethod === "online"
        ? onlinePaymentProvider === "paypal"
          ? "paypal"
          : "stripe"
        : undefined,
    orderType,
    deliveryAddress,
    tableNumber:
      typeof body.tableNumber === "string" ? body.tableNumber : undefined,
    items,
  };
}

export function validateDeliveryAddress(value: unknown) {
  if (!value || typeof value !== "object") {
    throw new OrderRepositoryError("A delivery address is required", 400);
  }
  const address = value as Record<string, unknown>;
  const street = typeof address.street === "string" ? address.street.trim() : "";
  const postalCode =
    typeof address.postalCode === "string" ? address.postalCode.trim() : "";
  const city = typeof address.city === "string" ? address.city.trim() : "";
  if (street.length < 3 || street.length > 120) {
    throw new OrderRepositoryError("Invalid delivery street", 400);
  }
  if (!/^[0-9]{5}$/.test(postalCode)) {
    throw new OrderRepositoryError("A valid German postal code is required", 400);
  }
  if (city.length < 2 || city.length > 80) {
    throw new OrderRepositoryError("Invalid delivery city", 400);
  }
  if (address.countryCode !== "DE") {
    throw new OrderRepositoryError("Delivery is available only in Germany", 400);
  }
  return { street, postalCode, city, countryCode: "DE" as const };
}
