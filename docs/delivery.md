# Delivery radius, minimum order, and estimates

Delivery rules are configured independently for each restaurant. FoodApp uses
concentric radius zones, calculated from the restaurant address to the
customer's German delivery address.

Default zones:

| Radius | Minimum basket | Delivery fee |
| --- | ---: | ---: |
| Up to 3 km | €15.00 | €2.00 |
| Up to 6 km | €25.00 | €3.50 |
| Up to 10 km | €40.00 | €5.00 |

Administrators can add, remove, disable, and change zones. The first active
zone whose maximum radius contains the address applies. Addresses beyond the
outermost active zone are rejected.

## Distance model

The implementation currently uses straight-line Haversine distance. It does
not claim to represent driving distance or travel time. This is predictable
for radius-based commercial rules and avoids charging customers based on a
browser-provided value.

Mapbox Geocoding API v6 converts both addresses to coordinates:

- The restaurant location is requested with permanent storage enabled and
  stored on the restaurant record.
- Customer coordinates use temporary geocoding for the immediate quote and
  are not stored.
- FoodApp stores only the resulting distance, selected zone, and fee on the
  order.

Set the server-only environment variable from
`config/delivery.env.example`:

```text
MAPBOX_ACCESS_TOKEN
```

The Mapbox account must support permanent geocoding before an administrator
uses **Geocode shop address**. The token must never use a `NEXT_PUBLIC_`
prefix.

## Checkout enforcement

The browser quote is informational. During final order creation the server:

1. reloads menu-authoritative items and prices;
2. recalculates the basket subtotal;
3. geocodes the submitted German address again;
4. recalculates distance;
5. selects the restaurant's active zone;
6. enforces its minimum basket;
7. applies the configured delivery fee to the order and payment amount;
8. stores the distance, zone, and fee snapshot.

The database function verifies that the zone belongs to the restaurant, covers
the distance, matches the fee, and has its minimum satisfied. Replaying the
same order operation cannot add the delivery fee twice.

The public quote route is same-origin checked, body-limited, and process-rate
limited. Final order creation retains its own origin, availability,
idempotency, pricing, and rate-limit checks. Admin configuration routes require
an authenticated session with membership in the selected restaurant's
business.

## Fulfilment estimate

Accepting an order requires an estimate between 10 and 180 minutes. The admin
dialog defaults to:

- 30 minutes for table and takeaway;
- 45 minutes for delivery.

The estimate is stored as an absolute timestamp, attributed in the immutable
order timeline, shown on the order card, and exposed through the guest-safe
tracking page. It is an operational estimate entered by the restaurant, not a
route-time calculation.
