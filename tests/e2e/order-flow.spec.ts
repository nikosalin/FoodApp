import { expect, test } from "@playwright/test";

test("guest can add an item and place a cash order", async ({ page }) => {
  await page.route("**/api/orders", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        order: {
          orderNumber: "A-1001",
          trackingToken: "order-token-1001",
        },
      }),
    });
  });

  await page.goto("/menu");

  await page
    .getByRole("button", { name: /Customize Fries/i })
    .first()
    .click();
  await page.getByRole("button", { name: "Add to cart" }).click();

  await page.getByRole("link", { name: "View cart" }).click();
  await expect(page.getByRole("heading", { name: "Your Cart" })).toBeVisible();

  await page.getByRole("link", { name: "Proceed to checkout" }).click();
  await expect(
    page.getByRole("heading", { name: "Complete your order" }),
  ).toBeVisible();

  await page.getByLabel("Name").fill("Test User");
  await page.getByLabel("Email").fill("test@example.com");
  await page.getByLabel("Phone (optional)").fill("123456789");

  await page.getByRole("button", { name: /Cash/i }).click();
  await page.getByRole("button", { name: "Place order" }).click();

  await expect(page).toHaveURL(/\/orders\/track\/order-token-1001$/);
});
