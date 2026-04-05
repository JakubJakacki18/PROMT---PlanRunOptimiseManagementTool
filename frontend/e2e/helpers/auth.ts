import { Page } from "@playwright/test";

const API = "http://localhost:8000/api";

/**
 * Loguje użytkownika przez UI (formularz logowania).
 * Używa domyślnego konta admina z .env → admin / admin
 */
export async function loginAsAdmin(page: Page) {
  await loginAs(page, "admin", "admin123");
}

/**
 * Loguje dowolnego użytkownika przez UI.
 */
export async function loginAs(
  page: Page,
  username: string,
  password: string
) {
  await page.goto("/login");
  await page.waitForSelector("#username");

  await page.fill("#username", username);
  await page.fill("#password", password);
  await page.click('button[type="submit"]');

  // Czekamy na przekierowanie do dashboardu
  await page.waitForURL("**/dashboard/**", { timeout: 10_000 });
}

/**
 * Przechodzi bezpośrednio do panelu admina (zakłada, że jest się zalogowanym).
 */
export async function goToAdminPanel(page: Page) {
  await page.goto("/dashboard/admin");
  // Czekamy aż załaduje się tabela użytkowników
  await page.waitForSelector("#admin-panel-title");
}
