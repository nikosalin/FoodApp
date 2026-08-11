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
  excludedIngredients?: string[];
};

export type DeliveryAddress = {
  street: string;
  postalCode: string;
  city: string;
  countryCode: "DE";
};

export type RestaurantOrder = {
  id: string;
  restaurantId: string;
  orderNumber: string;
  orderType: "table" | "takeaway" | "delivery";
  deliveryAddress?: DeliveryAddress;
  deliveryDistanceMeters?: number;
  deliveryFee?: number;
  estimatedFulfillmentAt?: string;
  tableNumber?: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  customerNotes?: string;
  preferredChannel?: "email" | "sms";
  paymentMethod?: "online" | "cash_on_site" | "cash_on_delivery" | "external_card";
  paymentId?: string;
  paymentStatus?: "pending" | "authorized" | "captured" | "cancelled" | "refunded" | "failed";
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

export type OrderHistoryEvent = {
  id: string;
  orderId: string;
  eventType: string;
  fromStatus?: OrderStatus;
  toStatus?: OrderStatus;
  actorName?: string;
  details: Record<string, string | number | boolean | null>;
  createdAt: string;
};

export type DeletedRestaurantOrder = RestaurantOrder & {
  deletedAt: string;
};

export type OrderInput = {
  restaurantId: string;
  orderType: RestaurantOrder["orderType"];
  deliveryAddress?: DeliveryAddress;
  tableNumber?: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  preferredChannel: "email" | "sms";
  paymentMethod: "online" | "cash_on_site" | "cash_on_delivery" | "external_card";
  onlinePaymentProvider?: "stripe" | "paypal";
  items: OrderItem[];
  deliveryQuote?: {
    zoneId: string;
    distanceMeters: number;
    deliveryFee: number;
  };
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
