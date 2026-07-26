import { notFound } from "next/navigation";
import { OrderTracking } from "@/features/orders/components/OrderTracking";

export default async function OrderTrackingPage({
  params,
}: {
  params: Promise<{ trackingToken: string }>;
}) {
  const { trackingToken } = await params;
  if (!/^[a-f0-9]{32,64}$/.test(trackingToken)) notFound();
  return <OrderTracking trackingToken={trackingToken} />;
}
