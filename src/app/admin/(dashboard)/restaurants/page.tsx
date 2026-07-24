import type { Metadata } from "next";
import { RestaurantsManager } from "@/features/admin/components/RestaurantsManager";

export const metadata: Metadata = {
  title: "Restaurants | FoodApp Admin",
};

export default function AdminRestaurantsPage() {
  return <RestaurantsManager />;
}
