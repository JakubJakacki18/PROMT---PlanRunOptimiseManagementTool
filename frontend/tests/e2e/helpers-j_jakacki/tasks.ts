import { expect, Page } from "@playwright/test";

export async function createTask(page: Page) {
  const name = `Test Task ${Date.now()}`;
  await page.goto("/dashboard/tasks");
  await expect(
    page.getByRole("button", { name: "Dodaj zadanie" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Dodaj zadanie" }).click();
  await page
    .getByRole("textbox", { name: "Np. Przygotować ofertę" })
    .fill(name);
  await page.getByRole("button", { name: "Zapisz" }).click();
  return name;
}
