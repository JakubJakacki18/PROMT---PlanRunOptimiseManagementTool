import { test, expect } from "@playwright/test";

test("GIVEN admin w panelu WHEN tworzy użytkownika z rolą member THEN nowy user widoczny w tabeli z rolą Członek zespołu", async ({
  page,
}) => {
  await page.goto("/dashboard/admin");
  await page.waitForSelector("#admin-panel-title", { timeout: 10_000 });

  const uniqueUser = `testmember_${Date.now()}`;

  await page.click("#create-user-btn");
  await expect(page.locator('[role="dialog"]')).toBeVisible();
  await expect(page.locator("#modal-title")).toContainText("Nowy użytkownik");

  await page.fill("#field-username", uniqueUser);
  await page.fill("#field-email", `${uniqueUser}@example.com`);
  await page.fill("#field-first-name", "Jan");
  await page.fill("#field-last-name", "Testowy");
  await page.fill("#field-password", "haslo123");
  await page.selectOption("#field-role", "member");
  await page.fill("#field-phone", "+48123456789");
  await page.click("#submit-user-btn");

  await expect(page.locator('[role="dialog"]')).not.toBeVisible({
    timeout: 8_000,
  });

  await page.fill("#search-users-input", uniqueUser);

  const row = page.locator("tbody tr.ap__row").filter({ hasText: uniqueUser });
  await expect(row).toBeVisible({ timeout: 8_000 });
  await expect(row.locator(".ap__role-badge")).toContainText("Członek zespołu");
});
