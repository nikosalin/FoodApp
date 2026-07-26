import type { Metadata } from "next";
import { AdminLoginForm } from "@/features/admin/components/AdminLoginForm";

export const metadata: Metadata = {
  title: "Admin Login | FoodApp",
};

export default function AdminLoginPage() {
  return (
    <AdminLoginForm
      supabaseConfigured={Boolean(
        process.env.NEXT_PUBLIC_SUPABASE_URL &&
          process.env.SUPABASE_SECRET_KEY,
      )}
    />
  );
}
