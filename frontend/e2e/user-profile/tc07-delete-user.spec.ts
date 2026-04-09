import { test, expect } from "@playwright/test";

/**
 * TC-07: Usunięcie użytkownika z potwierdzeniem dwukrokowym
 *
 * GIVEN: Zalogowany administrator, w tabeli istnieje świeżo
 *        stworzony użytkownik
 * WHEN:  Klika ikonę kosza i potwierdza usunięcie
 * THEN:  Użytkownik znika z tabeli
 */
test("GIVEN admin i nowo utworzony user WHEN klika usuń i potwierdza THEN user znika z tabeli", async ({
  page,
}) => {
  await page.goto("/dashboard/admin");
  await page.waitForSelector("#admin-panel-title", { timeout: 10_000 });

  // Tworzymy użytkownika do usunięcia
  const userToDelete = `del_user_${Date.now()}`;
  await page.click("#create-user-btn");
  await expect(page.locator('[role="dialog"]')).toBeVisible();

  await page.fill("#field-username", userToDelete);
  await page.fill("#field-password", "haslo123");
  await page.click("#submit-user-btn");

  // Czekamy aż modal się zamknie
  await expect(page.locator('[role="dialog"]')).not.toBeVisible({
    timeout: 8_000,
  });

  // Szukamy nowego usera w tabeli
  const row = page.locator("[data-user-id]").filter({ hasText: userToDelete });
  await expect(row).toBeVisible({ timeout: 5_000 });

  const userId = await row.getAttribute("data-user-id");
  expect(userId).not.toBeNull();

  // Klikamy kosz
  await page.click(`[data-testid="delete-user-${userId}"]`);

  // Potwierdzamy usunięcie
  const confirmBtn = page.locator(`[data-testid="confirm-delete-${userId}"]`);
  await expect(confirmBtn).toBeVisible();
  await confirmBtn.click();

  // User znika z tabeli
  await expect(row).not.toBeVisible({ timeout: 8_000 });
});
