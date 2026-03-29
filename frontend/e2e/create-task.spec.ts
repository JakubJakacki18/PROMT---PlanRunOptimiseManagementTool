import { test, expect } from "@playwright/test";

test("logowanie i tworzenie zadania przypisanego do projektu #10", async ({
  page,
}) => {
  await page.goto("/login");
  await page.fill("#username", "admin");
  await page.fill("#password", "admin123");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard**");

  await page.goto("/dashboard/tasks");
  await expect(page.getByRole("button", { name: "Dodaj zadanie" })).toBeVisible();

  await page.getByRole("button", { name: "Dodaj zadanie" }).click();
  await expect(page.getByRole("heading", { name: "Dodaj zadanie" })).toBeVisible();

  await page.getByPlaceholder("Np. Przygotować ofertę").fill("ABC");
  await page.getByPlaceholder("Opcjonalnie").fill("Opis testowego zadania e2e");

  await page.locator('input[name="start_date"]').fill("2026-04-01");
  await page.locator('input[name="due_date"]').fill("2026-04-30");

  await page.getByRole("button", { name: "Przypisanie" }).click();
  await page.locator('input[type="radio"][value="project"]').check();

  const projectSelect = page.locator('select[name="projectId"]');
  await expect(projectSelect.locator("option").nth(1)).toBeAttached({ timeout: 10000 });

  const targetValue = await page.evaluate(() => {
    const select = document.querySelector('select[name="projectId"]') as HTMLSelectElement;
    const option = Array.from(select.options).find((o) => o.text.includes("Projekt 10"));
    return option?.value ?? null;
  });

  expect(targetValue, 'Nie znaleziono projektu "Projekt 10" — uruchom: dce backend python manage.py seed').not.toBeNull();
  await projectSelect.selectOption({ value: targetValue! });

  await page.getByRole("button", { name: "Zapisz" }).click();

  await expect(page.getByRole("heading", { name: "Dodaj zadanie" })).not.toBeVisible();
  await expect(page.getByRole("heading", { name: "ABC" }).first()).toBeVisible();
});
