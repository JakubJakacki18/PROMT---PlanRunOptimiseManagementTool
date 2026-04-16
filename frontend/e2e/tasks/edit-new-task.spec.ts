import { test, expect } from "@playwright/test";
import { createTask } from "../helpers/tasks";

test("test", async ({ page }) => {
  let taskName = await createTask(page);
  await page.goto("/dashboard/tasks");
  await expect(page.getByText(taskName)).toBeVisible();

  const row = page.locator(".task-card", { hasText: taskName });
  await row.getByRole("button", { name: "Edytuj" }).click();

  await page.locator('select[name="status"]').selectOption("doing");
  await page.locator('select[name="priority"]').selectOption("1");
  await page.locator('input[name="start_date"]').fill("2026-04-10");
  await page.locator('input[name="due_date"]').fill("2026-04-17");
  await page.getByRole("textbox", { name: "Opcjonalnie" }).fill("opis");
  taskName = "new " + taskName;
  await page
    .getByRole("textbox", { name: "Np. Przygotować ofertę" })
    .fill(taskName);
  await page.getByRole("button", { name: "Koszty" }).click();
  await page.getByPlaceholder("0", { exact: true }).fill("2");
  await page.getByPlaceholder("0.00").fill("3.33");
  await page.getByRole("button", { name: "Załącznik / paragon" }).click();
  await page
    .getByRole("textbox", { name: "https://…" })
    .fill("https://google.pl");
  await page.locator('input[name="receipt_note"]').fill("test");
  await expect(page.getByText(taskName)).not.toBeVisible();
});
