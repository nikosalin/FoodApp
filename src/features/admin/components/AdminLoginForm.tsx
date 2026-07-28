"use client";

import { ArrowLeft, Lock, Mail, Shield } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  AdminCard,
  fieldClassName,
  primaryButtonClassName,
} from "./AdminUi";

export function AdminLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  return (
    <main className="flex min-h-screen items-center justify-center bg-stone-100 px-4 py-10 text-stone-950">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-stone-600 hover:text-stone-950"
        >
          <ArrowLeft className="size-4" />
          Back to home
        </Link>
        <AdminCard className="p-7 sm:p-8">
          <div className="mb-7 text-center">
            <span className="mx-auto mb-4 grid size-16 place-items-center rounded-2xl bg-stone-950 text-amber-300">
              <Shield className="size-8" />
            </span>
            <h1 className="text-2xl font-black">Admin login</h1>
            <p className="mt-1 text-sm text-stone-500">
              Manage restaurant onboarding and access.
            </p>
          </div>

          {error && (
            <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}

          <form
            className="space-y-4"
            onSubmit={async (event) => {
              event.preventDefault();
              setError("");
              setLoading(true);
              try {
                const response = await fetch("/api/admin/session", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ email, password }),
                });
                const body = (await response.json()) as { error?: string };
                if (!response.ok) {
                  setError(body.error || "Login failed.");
                  return;
                }
                router.push("/admin");
              } catch {
                setError("Unable to reach the login service.");
              } finally {
                setLoading(false);
              }
            }}
          >
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold">Email</span>
              <span className="relative block">
                <Mail className="absolute left-3 top-3.5 size-4 text-stone-400" />
                <input
                  className={`${fieldClassName} pl-10`}
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  required
                />
              </span>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold">
                Password
              </span>
              <span className="relative block">
                <Lock className="absolute left-3 top-3.5 size-4 text-stone-400" />
                <input
                  className={`${fieldClassName} pl-10`}
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  required
                />
              </span>
            </label>
            <button
              className={`${primaryButtonClassName} w-full`}
              type="submit"
              disabled={loading}
            >
              {loading ? "Logging in…" : "Log in as admin"}
            </button>
          </form>

        </AdminCard>
      </div>
    </main>
  );
}
