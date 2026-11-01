import { expect, test } from "@playwright/test";

test("landing renders", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/MrStockd/i);
});

test("builders renders", async ({ page }) => {
  await page.goto("/builders");
  await expect(page.getByRole("heading", { name: /for builders/i })).toBeVisible();
});
