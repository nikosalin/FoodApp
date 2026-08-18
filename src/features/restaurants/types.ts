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
  acceptsTable: boolean;
  acceptsTakeaway: boolean;
  acceptsDelivery: boolean;
  cashOnDeliveryEnabled: boolean;
  source: "schedule" | "override" | "restaurant_blocked";
  message: string;
  weeklyHours: WeeklyOpeningHours;
  override?: OrderingOverride;
};

export type DeliveryZone = {
  id: string;
  maxDistanceMeters: number;
  minimumOrder: number;
  deliveryFee: number;
  active: boolean;
};

export type DeliverySettings = {
  restaurantId: string;
  restaurantAddress: string;
  coordinatesConfigured: boolean;
  zones: DeliveryZone[];
};

export type DeliveryQuote = {
  zoneId: string;
  distanceMeters: number;
  minimumOrder: number;
  deliveryFee: number;
  subtotal: number;
  total: number;
  minimumMet: boolean;
};
