import { expect, test } from "@playwright/test";

test("admin login redirects to dashboard", async ({ page }) => {
  await page.route("**/api/admin/session", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true }),
    });
  });

  await page.goto("/admin/login");

  await page.getByLabel("Email").fill("admin@example.com");
  await page.getByLabel("Password").fill("secret");
  await page.getByRole("button", { name: "Log in as admin" }).click();

  await expect(page).toHaveURL(/\/admin$/);
});
