import type { Metadata } from "next";
import { RestaurantOrderOverview } from "@/features/admin/components/RestaurantOrderOverview";

export const metadata: Metadata = {
  title: "Restaurant Orders | FoodApp Admin",
};

export default async function RestaurantOrdersPage({
  params,
}: {
  params: Promise<{ restaurantId: string }>;
}) {
  const { restaurantId } = await params;
  return <RestaurantOrderOverview restaurantId={restaurantId} />;
}
