import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import type { NextRequest, NextResponse } from "next/server";
import { seedAdminState } from "@/features/admin/data/seed";

const COOKIE_NAME = "foodapp_admin_session";
const MAX_AGE_SECONDS = 60 * 60 * 8;

export type ServerSession = {
  sub: string;
  email: string;
  name: string;
  restaurantIds: string[];
  exp: number;
};

function sessionSecret() {
  const configured = process.env.SESSION_SECRET;
  if (configured) return configured;
  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET must be configured in production");
  }
  return "foodapp-local-development-secret-change-before-production";
}

function signature(payload: string) {
  return createHmac("sha256", sessionSecret())
    .update(payload)
    .digest("base64url");
}

export function createSessionToken(input?: {
  sub: string;
  email: string;
  name: string;
  restaurantIds: string[];
}): string {
  const session: ServerSession = {
    sub: input?.sub ?? "admin-demo",
    email: input?.email ?? "admin@foodorder.com",
    name: input?.name ?? "Super Admin",
    restaurantIds:
      input?.restaurantIds ??
      seedAdminState.restaurants.map((restaurant) => restaurant.id),
    exp: Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS,
  };
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  return `${payload}.${signature(payload)}`;
}

export function readSession(request: NextRequest): ServerSession | null {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const [payload, suppliedSignature] = token.split(".");
  if (!payload || !suppliedSignature) return null;

  const expectedSignature = signature(payload);
  const supplied = Buffer.from(suppliedSignature);
  const expected = Buffer.from(expectedSignature);
  if (
    supplied.length !== expected.length ||
    !timingSafeEqual(supplied, expected)
  ) {
    return null;
  }

  try {
    const session = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as ServerSession;
    if (session.exp <= Math.floor(Date.now() / 1000)) return null;
    return session;
  } catch {
    return null;
  }
}

export function setSessionCookie(response: NextResponse, token: string) {
  response.cookies.set({
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set({
    name: COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export function canAccessRestaurant(
  session: ServerSession,
  restaurantId: string,
) {
  return session.restaurantIds.includes(restaurantId);
}

export function hasValidOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  return origin === request.nextUrl.origin;
}

export function credentialsAreValid(email: unknown, password: unknown) {
  if (typeof email !== "string" || typeof password !== "string") return false;
  const normalizedEmail = email.trim().toLowerCase();
  if (normalizedEmail.length > 64 || password.length > 64) return false;
  const actualEmail = Buffer.from(normalizedEmail.padEnd(64, "\0"));
  const expectedEmail = Buffer.from("admin@foodorder.com".padEnd(64, "\0"));
  const actualPassword = Buffer.from(password.padEnd(64, "\0"));
  const expectedPassword = Buffer.from("admin123".padEnd(64, "\0"));
  return (
    timingSafeEqual(actualEmail, expectedEmail) &&
    timingSafeEqual(actualPassword, expectedPassword)
  );
}
