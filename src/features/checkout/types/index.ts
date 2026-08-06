export type OrderType = "takeaway" | "table";
export type PaymentMethod = "online" | "cash_on_site";

export type StripeStep = {
  clientSecret: string;
  orderNumber: string;
  trackingToken: string;
};
