import { NextRequest } from "next/server";
import { authorizeRestaurant } from "@/features/orders/server/api";
import { subscribeToOrderEvents } from "@/features/orders/server/order-repository";

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
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode("event: connected\ndata: {}\n\n"));
      unsubscribe = subscribeToOrderEvents((event) => {
        if (event.restaurantId !== restaurantId) return;
        controller.enqueue(
          encoder.encode("event: orders-changed\ndata: {}\n\n"),
        );
      });
      keepAlive = setInterval(() => {
        controller.enqueue(encoder.encode(": keep-alive\n\n"));
      }, 20_000);
    },
    cancel() {
      unsubscribe();
      if (keepAlive) clearInterval(keepAlive);
    },
  });

  request.signal.addEventListener(
    "abort",
    () => {
      unsubscribe();
      if (keepAlive) clearInterval(keepAlive);
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
