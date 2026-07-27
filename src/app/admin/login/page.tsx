import type { Metadata } from "next";
import { AdminLoginForm } from "@/features/admin/components/AdminLoginForm";
import { isSupabaseConfigured } from "@/lib/supabase/admin";

export const metadata: Metadata = {
  title: "Admin Login | FoodApp",
};

export default function AdminLoginPage() {
  return (
    <AdminLoginForm
      supabaseConfigured={isSupabaseConfigured()}
    />
  );
}
