import { test, expect } from "@playwright/test";

test("team tab — wybór 3 osób i filtrowanie tasków", async ({ page }) => {
  // ── 1. Logowanie ─────────────────────────────────────────────────────────────
  await page.goto("/login");
  await page.fill("#username", "admin");
  await page.fill("#password", "admin123");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard**");

  // ── 2. Sekcja Projekty ────────────────────────────────────────────────────────
  await page.goto("/dashboard/projects");
  // Poczekaj aż lista projektów się załaduje i kliknij "Open project" na pierwszym
  await expect(page.getByRole("link", { name: "Open project" }).first()).toBeVisible({
    timeout: 10000,
  });
  await page.getByRole("link", { name: "Open project" }).first().click();

  // ── 3. Zakładka Team ──────────────────────────────────────────────────────────
  await expect(page.getByRole("link", { name: "Team" })).toBeVisible();
  await page.getByRole("link", { name: "Team" }).click();
  await page.waitForURL("**/team");

  // Poczekaj aż lista osób się załaduje
  await expect(page.locator(".team-person-row").first()).toBeVisible({ timeout: 10000 });

  // ── 4. Wybór trzech pierwszych osób z listy ───────────────────────────────────
  const people = page.locator(".team-person-row");
  await people.nth(0).locator("label.team-person-left").click();
  await people.nth(1).locator("label.team-person-left").click();
  await people.nth(2).locator("label.team-person-left").click();

  // Upewnij się że mamy tryb multi (3 osoby zaznaczone)
  await expect(page.locator(".team-selected-pill")).toContainText("3");

  // Filtry pojawiają się w .team-cards-grid (tryb multi)
  const totalBtn  = page.locator(".team-big-card-btn").filter({ hasText: /^Total/ });
  const todoBtn   = page.locator(".team-big-card-btn").filter({ hasText: /^Todo/ });
  const doingBtn  = page.locator(".team-big-card-btn").filter({ hasText: /^Doing/ });
  const overdueBtn= page.locator(".team-big-card-btn").filter({ hasText: /^Overdue/ });

  await expect(totalBtn).toBeVisible();

  // ── 5. Filtr: Total (all) ─────────────────────────────────────────────────────
  await totalBtn.click();
  await expect(totalBtn).toHaveClass(/is-active/);

  // ── 6. Filtr: Todo ───────────────────────────────────────────────────────────
  await todoBtn.click();
  await expect(todoBtn).toHaveClass(/is-active/);
  await expect(totalBtn).not.toHaveClass(/is-active/);

  // ── 7. Filtr: Doing ──────────────────────────────────────────────────────────
  await doingBtn.click();
  await expect(doingBtn).toHaveClass(/is-active/);
  await expect(todoBtn).not.toHaveClass(/is-active/);

  // ── 8. Filtr: Overdue ────────────────────────────────────────────────────────
  await overdueBtn.click();
  await expect(overdueBtn).toHaveClass(/is-active/);
  await expect(doingBtn).not.toHaveClass(/is-active/);
});
