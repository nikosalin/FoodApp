import type { Metadata } from "next";
import { AdminLoginForm } from "@/features/admin/components/AdminLoginForm";

export const metadata: Metadata = {
  title: "Admin Login | FoodApp",
};

export default function AdminLoginPage() {
  return <AdminLoginForm />;
}
