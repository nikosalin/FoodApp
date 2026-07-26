export type Weekday =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export type OpeningWindow = {
  opensAt: string;
  closesAt: string;
  closed?: boolean;
};

export type WeeklyOpeningHours = Record<Weekday, OpeningWindow>;

export type OrderingOverride = {
  mode: "open" | "closed";
  until?: string;
  reason?: string;
};

export type RestaurantAvailability = {
  restaurantId: string;
  timezone: "Europe/Berlin";
  acceptingOrders: boolean;
  cashOnDeliveryEnabled: boolean;
  source: "schedule" | "override" | "restaurant_blocked";
  message: string;
  weeklyHours: WeeklyOpeningHours;
  override?: OrderingOverride;
};
