import { test, expect } from "@playwright/test";

/**
 * TC-01: Dostęp do panelu administracyjnego
 *
 * GIVEN: Zalogowany administrator (storageState z auth.setup.ts)
 * WHEN:  Przechodzi do /dashboard/admin
 * THEN:  Widzi nagłówek "Panel Administracyjny", tabelę użytkowników
 *        i aktywny przycisk "Dodaj użytkownika"
 */
test("GIVEN zalogowany admin WHEN wchodzi do panelu admin THEN widzi nagłówek, tabelę i przycisk dodawania", async ({
  page,
}) => {
  await page.goto("/dashboard/admin");
  await page.waitForSelector("#admin-panel-title", { timeout: 10_000 });

  // Nagłówek panelu
  await expect(page.locator("#admin-panel-title")).toBeVisible();
  await expect(page.locator("#admin-panel-title")).toContainText(
    "Panel Administracyjny"
  );

  // Tabela użytkowników
  await expect(page.locator("#users-table")).toBeVisible();

  // Przycisk "Dodaj użytkownika"
  await expect(page.locator("#create-user-btn")).toBeVisible();
});
