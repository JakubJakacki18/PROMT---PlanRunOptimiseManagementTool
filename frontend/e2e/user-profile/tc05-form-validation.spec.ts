import { test, expect } from "@playwright/test";

/**
 * TC-05: Walidacja formularza tworzenia użytkownika
 *
 * GIVEN: Zalogowany administrator z otwartym modelem "Nowy użytkownik"
 * WHEN:  Próbuje wysłać formularz bez loginu, bez hasła
 *        lub z hasłem krótszym niż 6 znaków
 * THEN:  Modal NIE zamyka się — walidacja HTML5 blokuje submit
 */
test("GIVEN admin z otwartym formularzem WHEN wysyła bez wymaganych pól THEN modal pozostaje otwarty", async ({
  page,
}) => {
  await page.goto("/dashboard/admin");
  await page.waitForSelector("#admin-panel-title", { timeout: 10_000 });

  await page.click("#create-user-btn");
  await expect(page.locator('[role="dialog"]')).toBeVisible();

  // Próba 1: Pusty formularz
  await page.click("#submit-user-btn");
  await expect(page.locator('[role="dialog"]')).toBeVisible();

  // Próba 2: Tylko login, bez hasła
  await page.fill("#field-username", "testnopass");
  await page.click("#submit-user-btn");
  await expect(page.locator('[role="dialog"]')).toBeVisible();

  // Próba 3: Hasło za krótkie (< 6 znaków)
  await page.fill("#field-password", "abc");
  await page.click("#submit-user-btn");
  await expect(page.locator('[role="dialog"]')).toBeVisible();
});
