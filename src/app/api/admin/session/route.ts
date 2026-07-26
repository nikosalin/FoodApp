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
import { getServerSupabase } from "@/lib/supabase/server";
import { getAdminSupabase, isSupabaseConfigured } from "@/lib/supabase/admin";
import { databaseRestaurantId } from "@/features/orders/server/supabase-order-repository";

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
  const supabaseConfigured = isSupabaseConfigured();
  let authenticated = {
    sub: "admin-demo",
    email: "admin@foodorder.com",
    name: "Super Admin",
    restaurantIds: ["restaurant-1", "restaurant-2", "restaurant-3"],
  };
  if (supabaseConfigured) {
    if (typeof body.email !== "string" || typeof body.password !== "string") {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }
    const supabase = await getServerSupabase();
    const admin = getAdminSupabase();
    if (!supabase || !admin) {
      return NextResponse.json({ error: "Authentication is unavailable" }, { status: 503 });
    }
    const { data, error } = await supabase.auth.signInWithPassword({
      email: body.email.trim().toLowerCase(),
      password: body.password,
    });
    if (error || !data.user) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }
    const { data: memberships, error: membershipError } = await admin
      .from("business_admins")
      .select("business_id, role")
      .eq("user_id", data.user.id);
    if (membershipError || memberships.length === 0) {
      await supabase.auth.signOut();
      return NextResponse.json({ error: "Administrator access required" }, { status: 403 });
    }
    const { data: restaurants, error: restaurantsError } = await admin
      .from("restaurants")
      .select("id")
      .in("business_id", memberships.map((item) => item.business_id));
    if (restaurantsError) {
      return NextResponse.json({ error: "Unable to resolve access" }, { status: 503 });
    }
    const profile = await admin
      .from("profiles")
      .select("display_name")
      .eq("id", data.user.id)
      .maybeSingle();
    authenticated = {
      sub: data.user.id,
      email: data.user.email ?? body.email.trim().toLowerCase(),
      name: profile.data?.display_name ?? "Administrator",
      restaurantIds: restaurants.map((item) => applicationRestaurantId(item.id)),
    };
  } else if (!credentialsAreValid(body.email, body.password)) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  clearLoginRateLimit(clientKey);
  const response = NextResponse.json({
    admin: { email: authenticated.email, name: authenticated.name },
  });
  setSessionCookie(response, createSessionToken(authenticated));
  return response;
}

export async function DELETE(request: NextRequest) {
  if (!hasValidOrigin(request)) {
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  }
  const response = new NextResponse(null, { status: 204 });
  const supabase = await getServerSupabase();
  if (supabase) await supabase.auth.signOut();
  clearSessionCookie(response);
  return response;
}

function applicationRestaurantId(databaseId: string) {
  if (
    databaseId === databaseRestaurantId("restaurant-1") ||
    databaseId === databaseRestaurantId("restaurant-2")
  ) {
    return databaseId === databaseRestaurantId("restaurant-1")
      ? "restaurant-1"
      : "restaurant-2";
  }
  return databaseId;
}
