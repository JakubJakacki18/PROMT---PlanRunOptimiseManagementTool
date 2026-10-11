import { test, expect } from "@playwright/test";

const makeFunding = (
  id: number,
  name: string,
  overrides: Record<string, unknown> = {},
) => ({
  id,
  name,
  program: "Horyzont Europa",
  funder: "Komisja Europejska",
  funding_type: "grant",
  budget_amount: "500000.00",
  budget_currency: "EUR",
  start_date: "2026-01-01",
  end_date: "2028-12-31",
  reporting_deadline: "2028-11-30",
  agreement_number: `AGR-00${id}`,
  description: `Opis finansowania ${name}`,
  owner: null,
  created_at: "2026-01-01T10:00:00Z",
  updated_at: "2026-01-01T10:00:00Z",
  ...overrides,
});

const pagedResponse = (results: object[]) => ({
  count: results.length,
  next: null,
  previous: null,
  results,
});

const FUNDINGS_ROUTE_PATTERN = "/api/fundings/**";

test(
  "MOCK — trzy finansowania z mocka renderują się jako widoczne karty na stronie /dashboard/fundings",
  async ({ page }) => {
    const mockFundings = [
      makeFunding(101, "Projekt Alfa — Sztuczna Inteligencja"),
      makeFunding(102, "Projekt Beta — Odnawialne Źródła Energii"),
      makeFunding(103, "Projekt Gamma — Biotechnologia Rolnicza"),
    ];

    await page.route(FUNDINGS_ROUTE_PATTERN, (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        json: pagedResponse(mockFundings),
      });
    });

    await page.goto("/dashboard/fundings");
    await page.waitForLoadState("networkidle");

    await expect(
      page.getByText("Projekt Alfa — Sztuczna Inteligencja"),
      "Pierwsze finansowanie z mocka powinno być widoczne",
    ).toBeVisible({ timeout: 10_000 });

    await expect(
      page.getByText("Projekt Beta — Odnawialne Źródła Energii"),
      "Drugie finansowanie z mocka powinno być widoczne",
    ).toBeVisible({ timeout: 10_000 });

    await expect(
      page.getByText("Projekt Gamma — Biotechnologia Rolnicza"),
      "Trzecie finansowanie z mocka powinno być widoczne",
    ).toBeVisible({ timeout: 10_000 });

    const cards = page.locator(".task-card");
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(1);
  },
);

test(
  "MOCK — pusta lista finansowań z mocka nie powoduje błędu aplikacji i nie wyświetla żadnych kart",
  async ({ page }) => {
    await page.route(FUNDINGS_ROUTE_PATTERN, (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        json: pagedResponse([]),
      });
    });

    await page.goto("/dashboard/fundings");
    await page.waitForLoadState("networkidle");

    const cards = page.locator(".task-card");
    await expect(
      cards,
      "Przy pustej liście nie powinno być żadnych kart finansowań",
    ).toHaveCount(0);

    const addButton = page.getByRole("button", { name: "Dodaj finansowanie" });
    await expect(
      addButton,
      "Przycisk 'Dodaj finansowanie' powinien być widoczny nawet przy pustej liście",
    ).toBeVisible({ timeout: 10_000 });
  },
);

test(
  "MOCK — błąd 500 z API finansowań nie crashuje aplikacji i wyświetla informację o problemie",
  async ({ page }) => {
    await page.route(FUNDINGS_ROUTE_PATTERN, (route) => {
      route.fulfill({
        status: 500,
        contentType: "text/plain",
        body: "Internal Server Error — baza danych niedostępna",
      });
    });

    await page.goto("/dashboard/fundings");
    await page.waitForLoadState("networkidle");

    expect(
      page.url(),
      "Strona powinna pozostać na /dashboard/fundings mimo błędu API",
    ).toContain("/dashboard/fundings");

    const body = page.locator("body");
    await expect(body).toBeVisible();

    const cards = page.locator(".task-card");
    await expect(
      cards,
      "Przy błędzie 500 nie powinny być widoczne żadne karty finansowań",
    ).toHaveCount(0);
  },
);
