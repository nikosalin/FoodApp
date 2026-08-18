// import { expect, test } from "@playwright/test";

// test("empty cart state is visible", async ({ page }) => {
//   await page.goto("/cart");
//   await expect(page.getByRole("heading", { name: "Your Cart" })).toBeVisible();
//   await expect(page.getByText("Your cart is empty.")).toBeVisible();
//   await expect(
//     page.getByRole("link", { name: "Browse the menu" }),
//   ).toBeVisible();
// });

import { expect, test } from "@playwright/test";

test("empty cart state is visible", async ({ page }) => {
  await page.goto("/cart");
  await expect(
    page.getByRole("heading", { name: /Dein Warenkorb|Your Cart/i }),
  ).toBeVisible();
  await expect(
    page.getByText(/Dein Warenkorb ist leer\.|Your cart is empty\./i),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Zur Speisekarte|Browse the menu/i }),
  ).toBeVisible();
});
