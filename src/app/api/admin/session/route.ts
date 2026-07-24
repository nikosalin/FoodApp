import { NextRequest, NextResponse } from "next/server";
import {
  clearSessionCookie,
  createSessionToken,
  credentialsAreValid,
  hasValidOrigin,
  readSession,
  setSessionCookie,
} from "@/features/orders/server/auth";
import {
  checkLoginRateLimit,
  clearLoginRateLimit,
} from "@/features/orders/server/rate-limit";

export const runtime = "nodejs";

export function GET(request: NextRequest) {
  const session = readSession(request);
  if (!session) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }
  return NextResponse.json({
    admin: { email: session.email, name: session.name },
  });
}

export async function POST(request: NextRequest) {
  if (!hasValidOrigin(request)) {
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  }
  const contentType = request.headers.get("content-type") ?? "";
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (!contentType.includes("application/json") || contentLength > 2048) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const clientKey =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "local";
  const rateLimit = checkLoginRateLimit(clientKey);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many login attempts. Try again later." },
      {
        status: 429,
        headers: { "Retry-After": String(rateLimit.retryAfter) },
      },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Malformed JSON body" }, { status: 400 });
  }
  if (!credentialsAreValid(body.email, body.password)) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  clearLoginRateLimit(clientKey);
  const response = NextResponse.json({
    admin: { email: "admin@foodorder.com", name: "Super Admin" },
  });
  setSessionCookie(response, createSessionToken());
  return response;
}

export function DELETE(request: NextRequest) {
  if (!hasValidOrigin(request)) {
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  }
  const response = new NextResponse(null, { status: 204 });
  clearSessionCookie(response);
  return response;
}
