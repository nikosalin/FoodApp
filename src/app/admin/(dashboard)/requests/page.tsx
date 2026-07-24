import type { Metadata } from "next";
import { RequestsManager } from "@/features/admin/components/RequestsManager";

export const metadata: Metadata = {
  title: "Pending Requests | FoodApp Admin",
};

export default function AdminRequestsPage() {
  return <RequestsManager />;
}
