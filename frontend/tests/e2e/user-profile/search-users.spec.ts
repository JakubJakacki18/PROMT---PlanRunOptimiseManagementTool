import { test, expect } from "@playwright/test";

test("GIVEN admin z tabelą WHEN wpisuje frazę w wyszukiwarkę THEN tabela filtruje po nazwie", async ({
  page,
}) => {
  await page.goto("/dashboard/admin");
  await page.waitForSelector("tbody tr.ap__row", { timeout: 10_000 });

  const totalRows = await page.locator("tbody tr.ap__row").count();

  await page.fill("#search-users-input", "admin");

  const filteredRows = page.locator("tbody tr.ap__row");
  await expect(filteredRows.first()).toBeVisible({ timeout: 3_000 });

  const filteredCount = await filteredRows.count();
  expect(filteredCount).toBeLessThanOrEqual(totalRows);

  for (let i = 0; i < filteredCount; i++) {
    const text = await filteredRows.nth(i).textContent();
    expect(text?.toLowerCase()).toContain("admin");
  }

  await page.fill("#search-users-input", "");
  await expect(page.locator("tbody tr.ap__row")).toHaveCount(totalRows, {
    timeout: 3_000,
  });
});
