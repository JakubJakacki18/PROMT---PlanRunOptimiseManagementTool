import { test, expect } from "@playwright/test";

/**
 * TC-02: Tworzenie nowego użytkownika z rolą "Członek zespołu"
 *
 * GIVEN: Zalogowany administrator w panelu admin
 * WHEN:  Wypełnia formularz nowego użytkownika z rolą "member" i zapisuje
 * THEN:  Użytkownik pojawia się w tabeli z badge "Członek zespołu"
 */
test("GIVEN admin w panelu WHEN tworzy użytkownika z rolą member THEN nowy user widoczny w tabeli z rolą Członek zespołu", async ({
  page,
}) => {
  await page.goto("/dashboard/admin");
  await page.waitForSelector("#admin-panel-title", { timeout: 10_000 });

  // Unikalny login
  const uniqueUser = `testmember_${Date.now()}`;

  // Otwórz modal
  await page.click("#create-user-btn");
  await expect(page.locator('[role="dialog"]')).toBeVisible();
  await expect(page.locator("#modal-title")).toContainText("Nowy użytkownik");

  // Wypełnij formularz
  await page.fill("#field-username", uniqueUser);
  await page.fill("#field-email", `${uniqueUser}@example.com`);
  await page.fill("#field-first-name", "Jan");
  await page.fill("#field-last-name", "Testowy");
  await page.fill("#field-password", "haslo123");
  await page.selectOption("#field-role", "member");
  await page.fill("#field-phone", "+48123456789");

  // Zapisz
  await page.click("#submit-user-btn");

  // Modal zamknięty
  await expect(page.locator('[role="dialog"]')).not.toBeVisible({
    timeout: 8_000,
  });

  // Nowy user widoczny w tabeli
  const row = page.locator("[data-user-id]").filter({ hasText: uniqueUser });
  await expect(row).toBeVisible({ timeout: 5_000 });

  // Badge roli
  await expect(row.locator(".ap__role-badge")).toContainText("Członek zespołu");
});
