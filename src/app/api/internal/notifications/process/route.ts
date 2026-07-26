import { NextResponse } from "next/server";
import { processEmailOutbox } from "@/features/notifications/server/email-worker";
import { hasBearerSecret } from "@/features/notifications/server/secrets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!hasBearerSecret(request, process.env.EMAIL_WORKER_SECRET)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    return NextResponse.json(await processEmailOutbox());
  } catch {
    return NextResponse.json(
      { error: "Notification processing failed" },
      { status: 500 },
    );
  }
}
