import { NextRequest } from "next/server";
import { authorizeRestaurant } from "@/features/orders/server/api";
import { subscribeToOrderEvents } from "@/features/orders/server/order-repository";
import { isSupabaseConfigured } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ restaurantId: string }> },
) {
  const { restaurantId } = await params;
  const authorization = authorizeRestaurant(request, restaurantId);
  if (authorization.error) return authorization.error;

  const encoder = new TextEncoder();
  let unsubscribe = () => {};
  let keepAlive: ReturnType<typeof setInterval> | undefined;
  let databasePoll: ReturnType<typeof setInterval> | undefined;
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode("event: connected\ndata: {}\n\n"));
      if (isSupabaseConfigured()) {
        databasePoll = setInterval(() => {
          controller.enqueue(
            encoder.encode("event: orders-changed\ndata: {}\n\n"),
          );
        }, 5_000);
      } else {
        unsubscribe = subscribeToOrderEvents((event) => {
          if (event.restaurantId !== restaurantId) return;
          controller.enqueue(
            encoder.encode("event: orders-changed\ndata: {}\n\n"),
          );
        });
      }
      keepAlive = setInterval(() => {
        controller.enqueue(encoder.encode(": keep-alive\n\n"));
      }, 20_000);
    },
    cancel() {
      unsubscribe();
      if (keepAlive) clearInterval(keepAlive);
      if (databasePoll) clearInterval(databasePoll);
    },
  });

  request.signal.addEventListener(
    "abort",
    () => {
      unsubscribe();
      if (keepAlive) clearInterval(keepAlive);
      if (databasePoll) clearInterval(databasePoll);
    },
    { once: true },
  );

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
