import { test, expect } from "@playwright/test";

test("team tab — wybór 3 osób i filtrowanie tasków", async ({ page }) => {
  await page.goto("/dashboard/projects");
  await expect(
    page.getByRole("link", { name: "Open project" }).first(),
  ).toBeVisible({
    timeout: 10000,
  });
  await page.getByRole("link", { name: "Open project" }).first().click();

  await expect(page.getByRole("link", { name: "Team" })).toBeVisible();
  await page.getByRole("link", { name: "Team" }).click();
  await page.waitForURL("**/team");

  await expect(page.locator(".team-person-row").first()).toBeVisible({
    timeout: 10000,
  });

  const people = page.locator(".team-person-row");
  await people.nth(0).locator("label.team-person-left").click();
  await people.nth(1).locator("label.team-person-left").click();
  await people.nth(2).locator("label.team-person-left").click();

  await expect(page.locator(".team-selected-pill")).toContainText("3");

  const totalBtn = page
    .locator(".team-big-card-btn")
    .filter({ hasText: /^Total/ });
  const todoBtn = page
    .locator(".team-big-card-btn")
    .filter({ hasText: /^Todo/ });
  const doingBtn = page
    .locator(".team-big-card-btn")
    .filter({ hasText: /^Doing/ });
  const overdueBtn = page
    .locator(".team-big-card-btn")
    .filter({ hasText: /^Overdue/ });

  await expect(totalBtn).toBeVisible();

  await totalBtn.click();
  await expect(totalBtn).toHaveClass(/is-active/);

  await todoBtn.click();
  await expect(todoBtn).toHaveClass(/is-active/);
  await expect(totalBtn).not.toHaveClass(/is-active/);

  await doingBtn.click();
  await expect(doingBtn).toHaveClass(/is-active/);
  await expect(todoBtn).not.toHaveClass(/is-active/);

  await overdueBtn.click();
  await expect(overdueBtn).toHaveClass(/is-active/);
  await expect(doingBtn).not.toHaveClass(/is-active/);
});
