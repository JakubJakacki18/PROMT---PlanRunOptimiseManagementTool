import { Page } from "@playwright/test";

/**
 * Loguje admina przez formularz UI.
 * Konto: admin / admin123 (z .env → DJANGO_SUPERUSER_PASSWORD)
 */
export async function loginAsAdmin(page: Page) {
  await loginAs(page, "admin", "admin123");
}

/**
 * Loguje dowolnego użytkownika przez formularz UI.
 * Po zalogowaniu czeka na przekierowanie do dashboardu.
 */
export async function loginAs(
  page: Page,
  username: string,
  password: string,
) {
  await page.goto("/login");
  await page.waitForSelector("#username", { timeout: 15_000 });

  await page.fill("#username", username);
  await page.fill("#password", password);
  await page.click('button[type="submit"]');

  await page.waitForURL("**/dashboard/**", { timeout: 10_000 });
}

/**
 * Przechodzi do panelu administracyjnego.
 * Wymaga zalogowanego użytkownika z rolą admin.
 */
export async function goToAdminPanel(page: Page) {
  await page.goto("/dashboard/admin");
  await page.waitForSelector("#admin-panel-title", { timeout: 10_000 });
}
