export type RegistrationRequest = {
  id: string;
  restaurantName: string;
  ownerName: string;
  phone: string;
  email: string;
  city: string;
  address: string;
  restaurantType: string;
  heardFrom?: string;
  notes?: string;
  createdAt: string;
};

export type RestaurantStatus = "active" | "blocked" | "trial";
export type SubscriptionPlan = "free_trial" | "starter" | "pro";

export type Restaurant = {
  id: string;
  name: string;
  slug: string;
  ownerName: string;
  phone: string;
  email: string;
  city: string;
  address: string;
  restaurantType: string;
  subscriptionPlan: SubscriptionPlan;
  status: RestaurantStatus;
  internalNotes?: string;
  blockReason?: string;
  createdAt: string;
  updatedAt: string;
};

export type OrderStatus =
  | "pending"
  | "accepted"
  | "preparing"
  | "ready"
  | "completed"
  | "cancelled"
  | "rejected";

export type OrderItem = {
  menuItemId?: string;
  name: string;
  quantity: number;
  unitPrice: number;
};

export type RestaurantOrder = {
  id: string;
  restaurantId: string;
  orderNumber: string;
  orderType: "table" | "takeaway" | "delivery";
  tableNumber?: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  preferredChannel?: "email" | "sms";
  contactVerified?: boolean;
  trackingToken?: string;
  notificationStatus?: "pending" | "sent" | "failed";
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  createdAt: string;
  closedAt?: string;
  rejectionReason?: string;
  updatedAt?: string;
};

export type OrderInput = {
  restaurantId: string;
  orderType: RestaurantOrder["orderType"];
  tableNumber?: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  preferredChannel: "email" | "sms";
  items: OrderItem[];
};

export type AdminState = {
  requests: RegistrationRequest[];
  restaurants: Restaurant[];
  orders: RestaurantOrder[];
  totalOrders: number;
  todayRevenue: number;
};

export type AdminSession = {
  email: string;
  name: string;
};

export type GeneratedCredentials = {
  email: string;
  password: string;
  loginUrl: string;
};
