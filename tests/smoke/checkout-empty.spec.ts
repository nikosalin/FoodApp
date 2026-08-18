// import { expect, test } from "@playwright/test";

// test("checkout empty cart state is visible", async ({ page }) => {
//   await page.goto("/checkout");
//   await expect(
//     page.getByRole("heading", { name: "Your cart is empty" }),
//   ).toBeVisible();
//   await expect(
//     page.getByRole("link", { name: "Browse the menu" }),
//   ).toBeVisible();
// });

import { expect, test } from "@playwright/test";

test("checkout empty cart state is visible", async ({ page }) => {
  await page.goto("/checkout");
  await expect(
    page.getByRole("heading", {
      name: /Dein Warenkorb ist leer|Your cart is empty/i,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Menü durchsuchen|Browse the menu/i }),
  ).toBeVisible();
});
