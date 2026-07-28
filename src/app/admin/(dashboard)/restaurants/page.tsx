import type { Metadata } from "next";
import { RestaurantsManager } from "@/features/admin/components/RestaurantsManager";

export const metadata: Metadata = {
  title: "Restaurants | Der Schöne Grieche Admin",
};

export default function AdminRestaurantsPage() {
  return <RestaurantsManager />;
}
