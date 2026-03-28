import { test, expect } from "@playwright/test";

test("logowanie i tworzenie zadania przypisanego do projektu #10", async ({
  page,
}) => {
  // ── 1. Logowanie ────────────────────────────────────────────────────────────
  await page.goto("/login");
  await page.fill("#username", "admin");
  await page.fill("#password", "admin123");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard**");

  // ── 2. Zakładka Zadania ──────────────────────────────────────────────────────
  await page.goto("/dashboard/tasks");
  await expect(page.getByRole("button", { name: "Dodaj zadanie" })).toBeVisible();

  // ── 3. Otwórz modal ──────────────────────────────────────────────────────────
  await page.getByRole("button", { name: "Dodaj zadanie" }).click();
  await expect(page.getByRole("heading", { name: "Dodaj zadanie" })).toBeVisible();

  // ── 4. Tytuł (3 znaki) — label nie ma htmlFor, używamy placeholder ───────────
  await page.getByPlaceholder("Np. Przygotować ofertę").fill("ABC");

  // ── 5. Opis ──────────────────────────────────────────────────────────────────
  await page.getByPlaceholder("Opcjonalnie").fill("Opis testowego zadania e2e");

  // ── 6. Daty ──────────────────────────────────────────────────────────────────
  await page.locator('input[name="start_date"]').fill("2026-04-01");
  await page.locator('input[name="due_date"]').fill("2026-04-30");

  // ── 7. Akordeon "Przypisanie" ────────────────────────────────────────────────
  await page.getByRole("button", { name: "Przypisanie" }).click();

  // ── 8. Scope = Projekt ────────────────────────────────────────────────────────
  await page.locator('input[type="radio"][value="project"]').check();

  // ── 9. Czekaj na załadowanie opcji, wybierz projekt zawierający "Projekt 10" ─
  const projectSelect = page.locator('select[name="projectId"]');

  // Poczekaj aż pojawi się co najmniej jedna prawdziwa opcja (nie placeholder)
  await expect(projectSelect.locator('option').nth(1)).toBeAttached({ timeout: 10000 });

  // Znajdź opcję zawierającą tekst "Projekt 10" i pobierz jej value
  const targetValue = await page.evaluate(() => {
    const select = document.querySelector('select[name="projectId"]') as HTMLSelectElement;
    const option = Array.from(select.options).find((o) => o.text.includes("Projekt 10"));
    return option?.value ?? null;
  });

  expect(targetValue, 'Nie znaleziono projektu "Projekt 10" — uruchom: dce backend python manage.py seed').not.toBeNull();
  await projectSelect.selectOption({ value: targetValue! });

  // ── 10. Zapisz ────────────────────────────────────────────────────────────────
  await page.getByRole("button", { name: "Zapisz" }).click();

  // Modal zamknięty + nowe zadanie widoczne na liście
  await expect(page.getByRole("heading", { name: "Dodaj zadanie" })).not.toBeVisible();
  await expect(page.getByRole("heading", { name: "ABC" }).first()).toBeVisible();
});
