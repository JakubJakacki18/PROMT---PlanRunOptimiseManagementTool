import { test, expect } from "@playwright/test";

test("projekt tasks — filtr zaległe + szukaj 'a' + priorytet Średni", async ({
  page,
}) => {
  await page.goto("/login");
  await page.fill("#username", "admin");
  await page.fill("#password", "admin123");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard**");

  await page.goto("/dashboard/projects");
  await expect(page.getByRole("link", { name: "Open project" }).first()).toBeVisible({
    timeout: 10000,
  });
  await page.getByRole("link", { name: "Open project" }).first().click();

  await expect(page.getByRole("link", { name: "Tasks" })).toBeVisible();
  await page.getByRole("link", { name: "Tasks" }).click();
  await page.waitForURL("**/tasks");

  await expect(page.locator(".tsk-list-subtitle")).toBeVisible({ timeout: 10000 });

  const zaleglyTile = page.locator(".tsk-kpi-tile").filter({ hasText: "Zaległe" });
  await zaleglyTile.click();
  await expect(zaleglyTile).toHaveClass(/is-active/);
  await expect(page.locator(".tsk-select").first()).toHaveValue("overdue");

  const searchInput = page.locator("input.tsk-search-input");
  await searchInput.fill("a");
  await expect(searchInput).toHaveValue("a");

  const srednipPill = page
    .locator(".tsk-filter-block")
    .filter({ hasText: "Priorytet" })
    .locator(".tsk-pill")
    .filter({ hasText: "Średni" });

  await srednipPill.click();
  await expect(srednipPill).toHaveClass(/is-active/);

  await expect(page.locator(".tsk-list-subtitle")).toContainText("widocznych");

  const cards = page.locator(".tsk-item-card");
  const count = await cards.count();

  for (let i = 0; i < count; i++) {
    await expect(cards.nth(i).locator(".tsk-badge-priority")).toContainText("Średni");
  }
});
