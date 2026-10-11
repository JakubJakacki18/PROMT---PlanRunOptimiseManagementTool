import { test, expect } from "@playwright/test";

test("GIVEN admin i nowo utworzony user WHEN klika usuń i potwierdza THEN user znika z tabeli", async ({
  page,
}) => {
  await page.goto("/dashboard/admin");
  await page.waitForSelector("#admin-panel-title", { timeout: 10_000 });

  const userToDelete = `del_user_${Date.now()}`;

  await page.click("#create-user-btn");
  await expect(page.locator('[role="dialog"]')).toBeVisible();

  await page.fill("#field-username", userToDelete);
  await page.fill("#field-password", "haslo123");
  await page.click("#submit-user-btn");

  await expect(page.locator('[role="dialog"]')).not.toBeVisible({
    timeout: 8_000,
  });

  await page.fill("#search-users-input", userToDelete);

  const row = page
    .locator("tbody tr.ap__row")
    .filter({ hasText: userToDelete });
  await expect(row).toBeVisible({ timeout: 8_000 });

  const userId = await row.getAttribute("data-user-id");
  expect(userId).not.toBeNull();

  await page.click(`[data-testid="delete-user-${userId}"]`);

  const confirmBtn = page.locator(`[data-testid="confirm-delete-${userId}"]`);
  await expect(confirmBtn).toBeVisible({ timeout: 5_000 });
  await confirmBtn.click();

  await expect(row).not.toBeVisible({ timeout: 8_000 });
});
