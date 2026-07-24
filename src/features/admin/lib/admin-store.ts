"use client";

import { seedAdminState } from "../data/seed";
import type {
  AdminSession,
  AdminState,
  GeneratedCredentials,
  RegistrationRequest,
  SubscriptionPlan,
} from "../types";

const DATA_KEY = "foodapp-admin-data-v2";
const SESSION_KEY = "foodapp-admin-session";
const CHANGE_EVENT = "foodapp-admin-data-change";

const cloneSeed = (): AdminState => JSON.parse(JSON.stringify(seedAdminState));

export function getAdminState(): AdminState {
  const saved = window.localStorage.getItem(DATA_KEY);
  if (!saved) {
    const initial = cloneSeed();
    window.localStorage.setItem(DATA_KEY, JSON.stringify(initial));
    return initial;
  }

  try {
    const parsed = JSON.parse(saved) as Partial<AdminState>;
    return {
      ...cloneSeed(),
      ...parsed,
      orders: parsed.orders ?? cloneSeed().orders,
    };
  } catch {
    const initial = cloneSeed();
    window.localStorage.setItem(DATA_KEY, JSON.stringify(initial));
    return initial;
  }
}

function saveAdminState(state: AdminState) {
  window.localStorage.setItem(DATA_KEY, JSON.stringify(state));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function subscribeToAdminState(callback: (state: AdminState) => void) {
  const notify = () => callback(getAdminState());
  notify();
  window.addEventListener(CHANGE_EVENT, notify);
  window.addEventListener("storage", notify);
  return () => {
    window.removeEventListener(CHANGE_EVENT, notify);
    window.removeEventListener("storage", notify);
  };
}

export function loginAdmin(email: string, password: string) {
  if (
    email.trim().toLowerCase() !== "admin@foodorder.com" ||
    password !== "admin123"
  ) {
    return false;
  }

  const session: AdminSession = {
    email: "admin@foodorder.com",
    name: "Super Admin",
  };
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return true;
}

export function getAdminSession(): AdminSession | null {
  const value = window.localStorage.getItem(SESSION_KEY);
  if (!value) return null;
  try {
    return JSON.parse(value) as AdminSession;
  } catch {
    return null;
  }
}

export function logoutAdmin() {
  window.localStorage.removeItem(SESSION_KEY);
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function temporaryPassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const values = crypto.getRandomValues(new Uint32Array(10));
  return Array.from(values, (value) => alphabet[value % alphabet.length]).join(
    "",
  );
}

export function approveRequest(
  request: RegistrationRequest,
  options: {
    email: string;
    subscriptionPlan: SubscriptionPlan;
    internalNotes: string;
  },
): GeneratedCredentials {
  const state = getAdminState();
  const now = new Date().toISOString();
  const password = temporaryPassword();

  state.requests = state.requests.filter((item) => item.id !== request.id);
  state.restaurants.unshift({
    id: crypto.randomUUID(),
    name: request.restaurantName,
    slug: slugify(request.restaurantName),
    ownerName: request.ownerName,
    phone: request.phone,
    email: options.email,
    city: request.city,
    address: request.address,
    restaurantType: request.restaurantType,
    subscriptionPlan: options.subscriptionPlan,
    status: options.subscriptionPlan === "free_trial" ? "trial" : "active",
    internalNotes: options.internalNotes || undefined,
    createdAt: now,
    updatedAt: now,
  });
  saveAdminState(state);

  return {
    email: options.email,
    password,
    loginUrl: `${window.location.origin}/login`,
  };
}

export function rejectRequest(requestId: string) {
  const state = getAdminState();
  state.requests = state.requests.filter((item) => item.id !== requestId);
  saveAdminState(state);
}

export function toggleRestaurant(
  restaurantId: string,
  blockReason?: string,
) {
  const state = getAdminState();
  state.restaurants = state.restaurants.map((restaurant) => {
    if (restaurant.id !== restaurantId) return restaurant;
    const unblocking = restaurant.status === "blocked";
    return {
      ...restaurant,
      status: unblocking ? "active" : "blocked",
      blockReason: unblocking ? undefined : blockReason,
      updatedAt: new Date().toISOString(),
    };
  });
  saveAdminState(state);
}
