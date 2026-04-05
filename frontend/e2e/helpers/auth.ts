import { Page } from "@playwright/test";

export async function loginAsAdmin(page: Page) {
  await loginAs(
    page,
    process.env.DJANGO_SUPERUSER_USERNAME ?? "admin",
    process.env.DJANGO_SUPERUSER_PASSWORD ?? "admin123",
  );
}

export async function loginAs(page: Page, username: string, password: string) {
  await page.goto("/login");
  await page.waitForSelector("#username", { timeout: 15_000 });
  await page.fill("#username", username);
  await page.fill("#password", password);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard/**", { timeout: 10_000 });
}

export async function goToAdminPanel(page: Page) {
  await page.goto("/dashboard/admin");
  await page.waitForSelector("#admin-panel-title", { timeout: 10_000 });
}
