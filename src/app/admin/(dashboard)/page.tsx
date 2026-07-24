import type { Metadata } from "next";
import { DashboardOverview } from "@/features/admin/components/DashboardOverview";

export const metadata: Metadata = {
  title: "Admin Dashboard | FoodApp",
};

export default function AdminDashboardPage() {
  return <DashboardOverview />;
}
