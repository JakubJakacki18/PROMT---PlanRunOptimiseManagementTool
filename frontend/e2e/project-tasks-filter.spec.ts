import { test, expect } from "@playwright/test";

test("projekt tasks — filtr zaległe + szukaj 'a' + priorytet Średni", async ({
  page,
}) => {
  // ── 1. Logowanie ─────────────────────────────────────────────────────────────
  await page.goto("/login");
  await page.fill("#username", "admin");
  await page.fill("#password", "admin123");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard**");

  // ── 2. Sekcja Projekty ────────────────────────────────────────────────────────
  await page.goto("/dashboard/projects");
  await expect(page.getByRole("link", { name: "Open project" }).first()).toBeVisible({
    timeout: 10000,
  });
  await page.getByRole("link", { name: "Open project" }).first().click();

  // ── 3. Zakładka Tasks ─────────────────────────────────────────────────────────
  await expect(page.getByRole("link", { name: "Tasks" })).toBeVisible();
  await page.getByRole("link", { name: "Tasks" }).click();
  await page.waitForURL("**/tasks");

  // Poczekaj na załadowanie tasków (pojawi się licznik w subtytule)
  await expect(page.locator(".tsk-list-subtitle")).toBeVisible({ timeout: 10000 });

  // ── 4. Filtr "Zaległe" (KPI tile) ────────────────────────────────────────────
  const zaleglyTile = page.locator(".tsk-kpi-tile").filter({ hasText: "Zaległe" });
  await zaleglyTile.click();
  await expect(zaleglyTile).toHaveClass(/is-active/);

  // Select "Termin" w panelu filtrów powinien też pokazywać "Zaległe"
  await expect(page.locator(".tsk-select").first()).toHaveValue("overdue");

  // ── 5. Szukaj zadań zawierających literę "a" ──────────────────────────────────
  const searchInput = page.locator('input.tsk-search-input');
  await searchInput.fill("a");
  await expect(searchInput).toHaveValue("a");

  // ── 6. Priorytet: Średni ──────────────────────────────────────────────────────
  // Klikalny pill w sekcji Priorytet
  const srednipPill = page
    .locator(".tsk-filter-block")
    .filter({ hasText: "Priorytet" })
    .locator(".tsk-pill")
    .filter({ hasText: "Średni" });

  await srednipPill.click();
  await expect(srednipPill).toHaveClass(/is-active/);

  // ── 7. Weryfikacja stanu filtrów ──────────────────────────────────────────────
  // Subtitle musi się zaktualizować — wyświetla liczbę widocznych wyników
  await expect(page.locator(".tsk-list-subtitle")).toContainText("widocznych");

  // Wszystkie widoczne karty zadań muszą:
  //   • mieć priorytet "Średni" (badge tsk-badge-priority)
  //   • być zaległe (badge tsk-badge-overdue) LUB zawierać "a" (bo filtr wyszukiwania)
  // Sprawdzamy tylko że jeśli karty są widoczne, to każda ma badge "Średni"
  const cards = page.locator(".tsk-item-card");
  const count = await cards.count();

  for (let i = 0; i < count; i++) {
    await expect(cards.nth(i).locator(".tsk-badge-priority")).toContainText("Średni");
  }
});
