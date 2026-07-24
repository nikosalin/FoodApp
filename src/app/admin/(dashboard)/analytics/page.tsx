import type { Metadata } from "next";
import { AnalyticsPanel } from "@/features/admin/components/AnalyticsPanel";

export const metadata: Metadata = {
  title: "Analytics | FoodApp Admin",
};

export default function AdminAnalyticsPage() {
  return <AnalyticsPanel />;
}
