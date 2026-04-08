import {test, expect} from "@playwright/test";

test("logowanie i walidacja błędów przy dodawaniu finansowania", async ({
                                                                            page,
                                                                        }) => {

    await page.goto("/dashboard/fundings");
    await expect(page.getByRole("button", {name: "Dodaj finansowanie"})).toBeVisible();

    await page.getByRole("button", {name: "Dodaj finansowanie"}).click();
    await expect(page.getByRole("heading", {name: "Dodaj finansowanie"})).toBeVisible();

    await page.getByLabel("Nazwa").fill("a");
    await page.locator('input[name="program"]').fill("sda");
    await page.locator('input[name="funder"]').fill("ds");
    await page.getByRole("combobox", {name: "Typ"}).selectOption({label: "Grant"});

    await page.getByRole("button", {name: "Budżet"}).click();
    await page.locator('input[name="amount_total"]').fill("-1");
    await page.locator('input[name="currency"]').fill("a");

    await page.getByRole("button", {name: "Daty"}).click();
    await page.locator('input[name="start_date"]').fill("2026-03-20");
    await page.locator('input[name="end_date"]').fill("2026-03-10");
    await page.locator('input[name="reporting_deadline"]').fill("1999-02-10");

    await expect(page.getByText("Nazwa musi mieć min. 2 znaki")).toBeVisible();
    await expect(page.getByText("Kwota musi być liczbą")).toBeVisible();
    await expect(page.getByText("Waluta musi mieć 3 znaki")).toBeVisible();
    await expect(page.getByText("Data końcowa nie może być wcześniejsza niż start")).toBeVisible();

    await expect(page.getByRole("button", {name: "Dodaj", exact: true})).toBeDisabled();
    await expect(page.getByRole("heading", {name: "Dodaj finansowanie"})).toBeVisible();
});
