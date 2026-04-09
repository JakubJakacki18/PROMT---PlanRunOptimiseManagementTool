import { test, expect } from "@playwright/test";

/**
 * TC-04: Filtrowanie tabeli użytkowników po roli
 *
 * GIVEN: Zalogowany administrator w panelu admin z załadowaną tabelą
 * WHEN:  Wybiera filtr roli "Admin", potem "Viewer", potem "Wszystkie"
 * THEN:  Każdy wyświetlony wiersz ma odpowiedni badge roli,
 *        a po resecie widać co najmniej 1 użytkownika
 */
test("GIVEN admin z tabelą WHEN filtruje po roli THEN każdy wiersz ma poprawny badge roli", async ({
  page,
}) => {
  await page.goto("/dashboard/admin");
  await page.waitForSelector("#admin-panel-title", { timeout: 10_000 });

  // Czekamy na załadowanie tabeli
  await page.waitForSelector("tbody tr.ap__row", { timeout: 8_000 });

  // ── Filtr: Admin ──
  await page.selectOption("#role-filter-select", "admin");
  const adminRows = page.locator("tbody tr.ap__row");
  const adminCount = await adminRows.count();

  if (adminCount > 0) {
    for (let i = 0; i < adminCount; i++) {
      const badge = adminRows.nth(i).locator(".ap__role-badge");
      await expect(badge).toContainText("Administrator");
    }
  }

  // ── Filtr: Viewer ──
  await page.selectOption("#role-filter-select", "viewer");
  const viewerRows = page.locator("tbody tr.ap__row");
  const viewerCount = await viewerRows.count();

  if (viewerCount > 0) {
    for (let i = 0; i < viewerCount; i++) {
      const badge = viewerRows.nth(i).locator(".ap__role-badge");
      await expect(badge).toContainText("Viewer");
    }
  }

  // ── Reset: Wszystkie role ──
  await page.selectOption("#role-filter-select", "all");
  const allRows = page.locator("tbody tr.ap__row");
  const allCount = await allRows.count();
  expect(allCount).toBeGreaterThanOrEqual(1);
});
