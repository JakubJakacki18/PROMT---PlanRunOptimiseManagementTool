import { test, expect } from "@playwright/test";

test("GIVEN zalogowany admin WHEN wchodzi do panelu admin THEN widzi nagłówek, tabelę i przycisk dodawania", async ({
  page,
}) => {
  await page.goto("/dashboard/admin");
  await page.waitForSelector("#admin-panel-title", { timeout: 10_000 });

  await expect(page.locator("#admin-panel-title")).toContainText(
    "Panel Administracyjny",
  );
  await expect(page.locator("#users-table")).toBeVisible();
  await expect(page.locator("#create-user-btn")).toBeVisible();
});
