import "server-only";

import type { NextRequest } from "next/server";
import { readSession } from "@/features/orders/server/auth";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { getServerSupabase } from "@/lib/supabase/server";

export async function authorizeMarketplaceAdmin(request: NextRequest) {
  const session = readSession(request);
  if (!session) return null;

  const server = await getServerSupabase();
  const admin = getAdminSupabase();
  if (!server || !admin) return null;

  const { data: { user }, error: userError } = await server.auth.getUser();
  if (userError || !user || user.id !== session.sub) return null;

  const memberships = await admin
    .from("business_admins")
    .select("business_id")
    .eq("user_id", user.id);
  if (memberships.error || memberships.data.length === 0) return null;

  return {
    userId: user.id,
    businessIds: memberships.data.map((membership) => membership.business_id),
  };
}

