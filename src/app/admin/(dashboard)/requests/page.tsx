import type { Metadata } from "next";
import { RequestsManager } from "@/features/admin/components/RequestsManager";

export const metadata: Metadata = {
  title: "Pending Requests | Der Schöne Grieche Admin",
};

export default function AdminRequestsPage() {
  return <RequestsManager />;
}
