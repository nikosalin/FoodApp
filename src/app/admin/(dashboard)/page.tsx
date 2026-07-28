import type { Metadata } from "next";
import { DashboardOverview } from "@/features/admin/components/DashboardOverview";

export const metadata: Metadata = {
  title: "Admin Dashboard | Der Schöne Grieche",
};

export default function AdminDashboardPage() {
  return <DashboardOverview />;
}
