import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 390, height: 844 } });

test("checkout offers pickup, delivery, and eat-in with a delivery quote", async ({
  page,
}) => {
  await page.route("**/api/restaurants/restaurant-1/availability", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        availability: {
          restaurantId: "restaurant-1",
          timezone: "Europe/Berlin",
          acceptingOrders: true,
          acceptsTable: true,
          acceptsTakeaway: true,
          acceptsDelivery: true,
          cashOnDeliveryEnabled: true,
          source: "schedule",
          message: "Accepting orders.",
          weeklyHours: {},
        },
      }),
    }),
  );
  await page.route("**/api/restaurants/restaurant-1/delivery-quote", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        quote: {
          zoneId: "zone-3km",
          distanceMeters: 1800,
          minimumOrder: 5,
          deliveryFee: 2,
          subtotal: 5,
          total: 7,
          minimumMet: true,
        },
      }),
    }),
  );

  await page.goto("/menu");
  const itemButton = page
    .getByRole("button", { name: /Anpassen Tzatziki|Customize Tzatziki/i })
    .first();
  await itemButton.focus();
  await itemButton.press("Enter");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /In den Warenkorb|Add to cart/i })
    .click();
  await page.goto("/checkout");

  await expect(page.getByRole("button", { name: /Abholung|Pickup/i }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: /Lieferung|Delivery/i }).first()).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: /Vor Ort essen|Eat in/i })).toBeVisible();

  await page.getByLabel(/Straße und Hausnummer|Street and house number/i).fill("Torstraße 10");
  await page.getByLabel(/Postleitzahl|Postal code/i).fill("10119");
  await page.getByLabel(/Stadt|City/i).fill("Berlin");
  await page.getByRole("button", { name: /Lieferung prüfen|Check delivery/i }).click();

  await expect(page.getByText(/€2\.00/).first()).toBeVisible();
  await expect(page.getByRole("button", { name: /Bar bei Lieferung|Cash on delivery/i })).toBeVisible();
});
