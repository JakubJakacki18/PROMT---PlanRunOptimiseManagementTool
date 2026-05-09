import { test, expect } from "@playwright/test";
import { createFunding } from "../helpers-j_jakacki/fundings";

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
  await page.getByRole("button", { name: "Zapisz" }).click();
  await expect(
    page.getByRole("heading", { name: "Nowe zadanie do fundingu" }),
  ).toBeVisible();
});
