export type OrderType = "takeaway" | "table" | "delivery";
export type PaymentMethod = "online" | "cash_on_site" | "cash_on_delivery";

export type StripeStep = {
  clientSecret: string;
  orderNumber: string;
  trackingToken: string;
};
