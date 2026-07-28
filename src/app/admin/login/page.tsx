import type { Metadata } from "next";
import { AdminLoginForm } from "@/features/admin/components/AdminLoginForm";

export const metadata: Metadata = {
  title: "Admin Login | Der Schöne Grieche",
};

export default function AdminLoginPage() {
  return <AdminLoginForm />;
}
