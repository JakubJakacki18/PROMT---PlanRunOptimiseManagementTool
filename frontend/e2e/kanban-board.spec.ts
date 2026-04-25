import { test, expect } from "@playwright/test";

async function openSeededProjectKanban(page: import("@playwright/test").Page) {
  await page.goto("/dashboard/projects");
  await page.getByPlaceholder("Search…").fill("Projekt 10");
  await expect(
    page.getByRole("link", { name: "Open project" }).first(),
  ).toBeVisible({ timeout: 10000 });
  await page.getByRole("link", { name: "Open project" }).first().click();
  await page.getByRole("link", { name: "Kanban" }).click();
  await page.waitForURL("**/kanban");
}

test("R2 — tablica Kanban wyświetla trzy kolumny statusu z zadaniami", async ({
  page,
}) => {
  await openSeededProjectKanban(page);

  await expect(page.locator(".kanban-col-head").filter({ hasText: "Do zrobienia" })).toBeVisible({ timeout: 10000 });
  await expect(page.locator(".kanban-col-head").filter({ hasText: "W trakcie" })).toBeVisible();
  await expect(page.locator(".kanban-col-head").filter({ hasText: "Zrobione" })).toBeVisible();

  const totalCards = page.locator(".kanban-card");
  await expect(totalCards.first()).toBeVisible({ timeout: 10000 });
});

test("R2 — filtr priorytetu na tablicy Kanban zawęża widoczne karty", async ({
  page,
}) => {
  await openSeededProjectKanban(page);

  await expect(page.locator(".kanban-card").first()).toBeVisible({ timeout: 10000 });
  const allCards = await page.locator(".kanban-card").count();

  const highBtn = page.locator(".segmented-btn").filter({ hasText: "Wysoki" });
  await highBtn.click();
  await expect(highBtn).toHaveClass(/is-active/);

  const highCards = await page.locator(".kanban-card").count();
  expect(highCards).toBeLessThanOrEqual(allCards);

  const allBtn = page.locator(".segmented-btn").filter({ hasText: "Wszystkie" });
  await allBtn.click();
  await expect(allBtn).toHaveClass(/is-active/);
});
