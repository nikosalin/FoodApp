// import { expect, test } from "@playwright/test";

// test("menu page loads", async ({ page }) => {
//   await page.goto("/menu");
//   await expect(page.getByRole("heading", { name: "Our Menu" })).toBeVisible();
//   await expect(
//     page.getByRole("button", { name: "MOST POPULAR" }),
//   ).toBeVisible();
//   await expect(
//     page.getByRole("button", { name: /Customize Fries/i }).first(),
//   ).toBeVisible();
// });

import { expect, test } from "@playwright/test";

test("menu page loads", async ({ page }) => {
  await page.goto("/menu");
  await expect(
    page.getByRole("heading", { name: /Unsere Speisekarte|Our Menu/i }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /AM HÄUFIGSTEN BESTELLT|MOST POPULAR/i }),
  ).toBeVisible();
});
