import {test, expect} from "@playwright/test";

test("logowanie i usunięcie finansowania", async ({page}) => {
    await page.goto("/dashboard/fundings");
    await expect(page.getByRole("button", {name: "Dodaj finansowanie"})).toBeVisible();

    const fundingName = `Test Funding ${Date.now()}`;

    await page.getByRole("button", {name: "Dodaj finansowanie"}).click();
    await page.getByLabel("Nazwa").fill(fundingName);
    await page.locator('input[name="program"]').fill("NCBIR");
    await page.locator('input[name="funder"]').fill("UE");
    await page.locator('select[name="type"]').selectOption("grant");

    await page.getByRole("button", {name: "Budżet"}).click();
    await page.locator('input[name="amount_total"]').fill("1000");
    await page.locator('input[name="currency"]').fill("PLN");

    await page.getByRole("button", {name: "Daty"}).click();
    await page.locator('input[name="start_date"]').fill("2026-03-30");
    await page.locator('input[name="end_date"]').fill("2026-04-30");

    await page.getByRole("button", {name: "Dodaj", exact: true}).click();
    await expect(page.getByText(fundingName)).toBeVisible();

    page.once("dialog", (dialog) => dialog.accept());

    const row = page.locator(".task-card", {hasText: fundingName});
    await row.getByRole("button", {name: "Usuń"}).click();

    await expect(page.getByText(fundingName)).not.toBeVisible();
});
