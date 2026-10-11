import { test, expect } from "@playwright/test";

test("GIVEN admin z otwartym formularzem WHEN wysyła bez wymaganych pól THEN modal pozostaje otwarty", async ({
  page,
}) => {
  await page.goto("/dashboard/admin");
  await page.waitForSelector("#admin-panel-title", { timeout: 10_000 });

  await page.click("#create-user-btn");
  await expect(page.locator('[role="dialog"]')).toBeVisible();

  await page.click("#submit-user-btn");
  await expect(page.locator('[role="dialog"]')).toBeVisible();

  await page.fill("#field-username", "testnopass");
  await page.click("#submit-user-btn");
  await expect(page.locator('[role="dialog"]')).toBeVisible();

  await page.fill("#field-password", "abc");
  await page.click("#submit-user-btn");
  await expect(page.locator('[role="dialog"]')).toBeVisible();
});
