import {test, expect} from "@playwright/test";


test("logowanie i dodanie poprawnego finansowania", async ({page}) => {
    await page.goto("/dashboard/fundings");
    await expect(page.getByRole("button", {name: "Dodaj finansowanie"})).toBeVisible();

    await page.getByRole("button", {name: "Dodaj finansowanie"}).click();
    await expect(page.getByRole("heading", {name: "Dodaj finansowanie"})).toBeVisible();

    await page.getByLabel("Nazwa").fill("Test Funding");
    await page.getByLabel("Program").fill("NCBIR");
    await page.getByLabel("Finansujący").fill("UE");
    await page.getByRole("combobox", {name: "Typ"}).selectOption({label: "Grant"});

    await page.getByRole("button", {name: "Budżet"}).click();
    await page.getByLabel("Kwota").fill("1000");
    await page.getByLabel("Waluta").fill("PLN");

    await page.getByRole("button", {name: "Daty"}).click();
    await page.locator('input[name="start_date"]').fill("2026-03-30");
    await page.locator('input[name="end_date"]').fill("2026-04-30");
    await page.locator('input[name="reporting_deadline"]').fill("2026-04-15");

    await page.getByRole("button", {name: "Szczegóły"}).click();
    await page.locator('input[name="agreement_number"]').fill("1500100900");
    await page.locator('textarea[name="description"]').fill("To jest poprawny grant");

    await expect(page.getByRole("button", {name: "Dodaj", exact: true})).toBeEnabled();
    await page.getByRole("button", {name: "Dodaj", exact: true}).click();

    await expect(page.getByRole("heading", {name: "Dodaj finansowanie"})).not.toBeVisible();
    await expect(page.getByText("Test Funding").first()).toBeVisible();
});
