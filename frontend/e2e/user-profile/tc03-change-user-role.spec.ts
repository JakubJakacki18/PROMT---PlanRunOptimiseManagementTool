import { test, expect } from "@playwright/test";

/**
 * TC-03: Zmiana roli użytkownika z Member na PM
 *
 * GIVEN: Zalogowany administrator w panelu admin, w tabeli istnieje
 *        użytkownik z rolą "Członek zespołu"
 * WHEN:  Edytuje tego użytkownika i zmienia rolę na "pm"
 * THEN:  Badge roli zmienia się na "Project Manager"
 */
test("GIVEN admin i user z rolą member WHEN zmienia rolę na pm THEN badge pokazuje Project Manager", async ({
  page,
}) => {
  await page.goto("/dashboard/admin");
  await page.waitForSelector("#admin-panel-title", { timeout: 10_000 });

  // Filtruj po roli member
  await page.selectOption("#role-filter-select", "member");

  // Pierwszy wiersz
  const firstRow = page.locator("tbody tr.ap__row").first();
  await expect(firstRow).toBeVisible({ timeout: 5_000 });

  const userId = await firstRow.getAttribute("data-user-id");
  expect(userId).not.toBeNull();

  // Otwórz modal edycji
  await page.click(`[data-testid="edit-user-${userId}"]`);
  await expect(page.locator('[role="dialog"]')).toBeVisible();
  await expect(page.locator("#modal-title")).toContainText("Edytuj:");

  // Zmień rolę na PM
  await page.selectOption("#field-role", "pm");
  await page.click("#submit-user-btn");

  // Modal zamknięty
  await expect(page.locator('[role="dialog"]')).not.toBeVisible({
    timeout: 8_000,
  });

  // Resetuj filtr i sprawdź badge
  await page.selectOption("#role-filter-select", "all");

  const editedRow = page.locator(`[data-user-id="${userId}"]`);
  await expect(editedRow.locator(".ap__role-badge")).toContainText(
    "Project Manager",
    { timeout: 5_000 }
  );
});
