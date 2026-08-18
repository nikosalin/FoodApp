// import { expect, test } from "@playwright/test";

// test("home page loads", async ({ page }) => {
//   await page.goto("/");
//   await expect(page.getByRole("heading", { name: "THE GREEKS" })).toBeVisible();
//   await expect(page.getByRole("link", { name: "Order online" })).toBeVisible();
//   await expect(page.getByRole("link", { name: "View cart" })).toBeVisible();
// });

import { expect, test } from "@playwright/test";

test("home page loads", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "THE GREEKS" })).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Jetzt bestellen|Order online/i }),
  ).toBeVisible();
  await expect(page.locator('a[href="/cart"]')).toBeVisible();
});
