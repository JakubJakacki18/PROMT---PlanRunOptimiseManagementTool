import { test as setup, expect } from "@playwright/test";
import path from "path";

const authFile = path.join(__dirname, "../playwright/.auth/admin.json");

setup("authenticate as admin", async ({ page }) => {
  await page.goto("/login");
  await page.waitForSelector("#username", { timeout: 15_000 });

  await page.fill("#username", process.env.DJANGO_SUPERUSER_USERNAME ?? "admin");
  await page.fill("#password", process.env.DJANGO_SUPERUSER_PASSWORD ?? "admin123");
  await page.click('button[type="submit"]');

  await page.waitForURL("**/dashboard/**", { timeout: 10_000 });
  await expect(page).toHaveURL(/\/dashboard/);

  await page.context().storageState({ path: authFile });
});
