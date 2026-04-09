import { test, expect } from "@playwright/test";

test("GIVEN admin i user z rolą member WHEN zmienia rolę na pm THEN badge pokazuje Project Manager", async ({
  page,
}) => {
  await page.goto("/dashboard/admin");
  await page.waitForSelector("#admin-panel-title", { timeout: 10_000 });

  await page.selectOption("#role-filter-select", "member");

  const firstRow = page.locator("tbody tr.ap__row").first();
  await expect(firstRow).toBeVisible({ timeout: 5_000 });

  const userId = await firstRow.getAttribute("data-user-id");
  expect(userId).not.toBeNull();

  await page.click(`[data-testid="edit-user-${userId}"]`);
  await expect(page.locator('[role="dialog"]')).toBeVisible();
  await expect(page.locator("#modal-title")).toContainText("Edytuj:");

  await page.selectOption("#field-role", "pm");
  await page.click("#submit-user-btn");

  await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 8_000 });

  await page.selectOption("#role-filter-select", "all");

  const editedRow = page.locator(`[data-user-id="${userId}"]`);
  await expect(editedRow.locator(".ap__role-badge")).toContainText("Project Manager", { timeout: 5_000 });
});
