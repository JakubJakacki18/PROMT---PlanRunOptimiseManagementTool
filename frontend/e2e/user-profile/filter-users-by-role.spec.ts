import { test, expect } from "@playwright/test";

test("GIVEN admin z tabelą WHEN filtruje po roli THEN każdy wiersz ma poprawny badge roli", async ({
  page,
}) => {
  await page.goto("/dashboard/admin");
  await page.waitForSelector("tbody tr.ap__row", { timeout: 10_000 });

  await page.selectOption("#role-filter-select", "admin");
  const adminRows = page.locator("tbody tr.ap__row");
  const adminCount = await adminRows.count();
  for (let i = 0; i < adminCount; i++) {
    await expect(adminRows.nth(i).locator(".ap__role-badge")).toContainText("Administrator");
  }

  await page.selectOption("#role-filter-select", "viewer");
  const viewerRows = page.locator("tbody tr.ap__row");
  const viewerCount = await viewerRows.count();
  for (let i = 0; i < viewerCount; i++) {
    await expect(viewerRows.nth(i).locator(".ap__role-badge")).toContainText("Viewer");
  }

  await page.selectOption("#role-filter-select", "all");
  expect(await page.locator("tbody tr.ap__row").count()).toBeGreaterThanOrEqual(1);
});
