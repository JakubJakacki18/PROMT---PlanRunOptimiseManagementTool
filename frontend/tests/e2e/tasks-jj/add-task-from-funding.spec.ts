import { test, expect } from "@playwright/test";
import { createFunding } from "../helpers/fundings";

test("Add task by funding site", async ({ page }) => {
  const fundingName = await createFunding(page);
  await page.goto("/dashboard/fundings");
  await expect(page.getByText(fundingName)).toBeVisible();
  const row = page.locator(".task-card", { hasText: fundingName });
  await row.click();
  await row.getByRole("button", { name: "Dodaj zadanie" }).click();
  await page
    .getByRole("textbox", { name: "Np. Przygotować ofertę" })
    .fill("Nowe zadanie do fundingu");
  await page.getByRole("textbox", { name: "Opcjonalnie" }).fill("opis");
  await page.locator('select[name="status"]').selectOption("doing");
  await page.locator('select[name="priority"]').selectOption("1");
  await page.locator('input[name="start_date"]').fill("2026-04-29");
  await page.locator('input[name="due_date"]').fill("2026-05-09");
  await page.getByRole("button", { name: "Koszty" }).click();
  await page.getByPlaceholder("0", { exact: true }).fill("30.5");
  await page.getByPlaceholder("0.00").fill("1000");
  await page.locator('select[name="cost_currency"]').selectOption("USD");
  await page.getByRole("button", { name: "Załącznik / paragon" }).click();
  await page
    .getByRole("textbox", { name: "https://…" })
    .fill("https://www.google.pl");
  await page.locator('input[name="receipt_note"]').fill("link do google");
  await page.getByRole("button", { name: "Zapisz" }).click();
  await expect(
    page.getByRole("heading", { name: "Nowe zadanie do fundingu" }),
  ).toBeVisible();
});
