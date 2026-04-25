import { test, expect } from "@playwright/test";

async function openSeededProjectOverview(page: import("@playwright/test").Page) {
  await page.goto("/dashboard/projects");
  await page.getByPlaceholder("Search…").fill("Projekt 10");
  await expect(
    page.getByRole("link", { name: "Open project" }).first(),
  ).toBeVisible({ timeout: 10000 });
  await page.getByRole("link", { name: "Open project" }).first().click();
  await page.getByRole("link", { name: "Overview" }).click();
  await page.waitForURL("**/overview");
}

test("R3 — zakładka Overview wyświetla nazwę projektu, licznik zadań i radar ryzyka", async ({
  page,
}) => {
  await openSeededProjectOverview(page);

  await expect(page.locator(".pov-title").first()).toBeVisible({ timeout: 10000 });

  await expect(page.locator(".pov-meta-item").filter({ hasText: "Zadania" })).toBeVisible();
  await expect(page.locator(".pov-meta-item").filter({ hasText: "Postęp" })).toBeVisible();

  await expect(page.getByText("Radar ryzyka")).toBeVisible();
  await expect(page.locator(".pov-mood-badge")).toBeVisible();
});

test("R3 — przełącznik wykresów w zakładce Overview przełącza widok", async ({
  page,
}) => {
  await openSeededProjectOverview(page);

  await expect(
    page.locator(".pov-chart-tab").filter({ hasText: "Aktywność dzienna" }),
  ).toBeVisible({ timeout: 10000 });

  const activityTab = page.locator(".pov-chart-tab").filter({ hasText: "Aktywność dzienna" });
  const weeklyTab = page.locator(".pov-chart-tab").filter({ hasText: "Rytm tygodnia" });
  const deliveryTab = page.locator(".pov-chart-tab").filter({ hasText: "Skuteczność dostarczania" });

  await expect(activityTab).toHaveClass(/is-active/);

  await weeklyTab.click();
  await expect(weeklyTab).toHaveClass(/is-active/);
  await expect(activityTab).not.toHaveClass(/is-active/);

  await deliveryTab.click();
  await expect(deliveryTab).toHaveClass(/is-active/);
  await expect(weeklyTab).not.toHaveClass(/is-active/);
});
