import { APIRequestContext, expect, test } from "@playwright/test";

const FUNDINGS_URL = "/api/fundings/";

async function getCsrfToken(request: APIRequestContext): Promise<string> {
  const state = await request.storageState();
  const cookie = state.cookies.find((c) => c.name === "csrftoken");
  if (!cookie) {
    throw new Error(
      "Brak ciasteczka csrftoken w storageState. " +
        "Upewnij się, że skrypt setup (auth.setup.ts) wykonał się poprawnie " +
        "i zapisał pełny stan sesji do playwright/.auth/admin.json.",
    );
  }
  return cookie.value;
}

async function createFunding(
  request: APIRequestContext,
  csrfToken: string,
  nameSuffix: string = "",
): Promise<number> {
  const uniqueName = `API Test Funding Orzech ${Date.now()}${nameSuffix}`;
  const response = await request.post(FUNDINGS_URL, {
    headers: { "X-CSRFToken": csrfToken },
    data: {
      name: uniqueName,
      program: "Horyzont Europa",
      funder: "Komisja Europejska",
      funding_type: "grant",
      budget_amount: "250000.00",
      budget_currency: "EUR",
      start_date: "2026-01-01",
      end_date: "2026-12-31",
      reporting_deadline: "2026-11-30",
      agreement_number: `AGR-${Date.now()}`,
      description: "Finansowanie utworzone automatycznie przez test Playwright.",
    },
  });

  if (!response.ok()) {
    const body = await response.text();
    throw new Error(
      `Nie udało się stworzyć finansowania pomocniczego. ` +
        `Status: ${response.status()}, Treść: ${body}`,
    );
  }

  const body = await response.json();
  return body.id as number;
}

test(
  "GET /api/fundings/ — zwraca 200 oraz obiekt z polami paginacji: count, next, previous, results",
  async ({ request }) => {
    const response = await request.get(FUNDINGS_URL);

    expect(
      response.status(),
      `Oczekiwano statusu 200 OK, otrzymano ${response.status()}`,
    ).toBe(200);

    const body = await response.json();

    expect(body, "Brak klucza 'count' w odpowiedzi").toHaveProperty("count");
    expect(body, "Brak klucza 'next' w odpowiedzi").toHaveProperty("next");
    expect(body, "Brak klucza 'previous' w odpowiedzi").toHaveProperty("previous");
    expect(body, "Brak klucza 'results' w odpowiedzi").toHaveProperty("results");

    expect(Array.isArray(body.results), "Pole 'results' powinno być tablicą").toBe(true);

    expect(
      typeof body.count === "number" && body.count >= 0,
      `Pole 'count' powinno być nieujemną liczbą, otrzymano: ${body.count}`,
    ).toBe(true);

    if (body.results.length > 0) {
      const firstFunding = body.results[0];

      expect(firstFunding, "Każde finansowanie musi mieć pole 'id'").toHaveProperty("id");
      expect(firstFunding, "Każde finansowanie musi mieć pole 'name'").toHaveProperty("name");
      expect(firstFunding, "Każde finansowanie musi mieć pole 'funding_type'").toHaveProperty("funding_type");

      expect(
        typeof firstFunding.id === "number" && firstFunding.id > 0,
        `Pole 'id' powinno być dodatnią liczbą całkowitą, otrzymano: ${firstFunding.id}`,
      ).toBe(true);
    }
  },
);

test(
  "POST /api/fundings/ — tworzy finansowanie z pełnym zestawem pól, GET zwraca identyczne dane, DELETE usuwa zasób",
  async ({ request }) => {
    const csrfToken = await getCsrfToken(request);

    const uniqueSuffix = Date.now();
    const payload = {
      name: `Horyzont Europa ${uniqueSuffix}`,
      program: "HE 2026",
      funder: "Komisja Europejska",
      funding_type: "grant",
      budget_amount: "1500000.00",
      budget_currency: "EUR",
      start_date: "2026-03-01",
      end_date: "2029-02-28",
      reporting_deadline: "2029-01-31",
      agreement_number: `HE-${uniqueSuffix}`,
      description: "Projekt badawczy w obszarze sztucznej inteligencji finansowany przez UE.",
    };

    const createResponse = await request.post(FUNDINGS_URL, {
      headers: { "X-CSRFToken": csrfToken },
      data: payload,
    });

    expect(
      createResponse.status(),
      `POST powinien zwrócić 201 Created. Otrzymano: ${createResponse.status()}`,
    ).toBe(201);

    const created = await createResponse.json();

    expect(created, "Odpowiedź POST musi zawierać pole 'id'").toHaveProperty("id");
    expect(typeof created.id === "number" && created.id > 0).toBe(true);

    expect(created.name).toBe(payload.name);
    expect(created.program).toBe(payload.program);
    expect(created.funder).toBe(payload.funder);
    expect(created.funding_type).toBe(payload.funding_type);
    expect(created.budget_currency).toBe(payload.budget_currency);
    expect(created.agreement_number).toBe(payload.agreement_number);

    const fundingId = created.id;

    const getResponse = await request.get(`${FUNDINGS_URL}${fundingId}/`);

    expect(
      getResponse.status(),
      `GET /api/fundings/${fundingId}/ powinien zwrócić 200 OK`,
    ).toBe(200);

    const fetched = await getResponse.json();
    expect(fetched.id).toBe(fundingId);
    expect(fetched.name).toBe(payload.name);
    expect(fetched.description).toBe(payload.description);

    const deleteResponse = await request.delete(`${FUNDINGS_URL}${fundingId}/`, {
      headers: { "X-CSRFToken": csrfToken },
    });

    expect(
      deleteResponse.ok(),
      `DELETE powinien zakończyć się sukcesem (2xx). Otrzymano: ${deleteResponse.status()}`,
    ).toBeTruthy();

    const afterDeleteResponse = await request.get(`${FUNDINGS_URL}${fundingId}/`);
    expect(
      afterDeleteResponse.status(),
      "Po usunięciu GET powinien zwrócić 404 Not Found",
    ).toBe(404);
  },
);

test(
  "POST /api/fundings/ z end_date < start_date — backend zwraca 400 Bad Request z polem błędu",
  async ({ request }) => {
    const csrfToken = await getCsrfToken(request);

    const invalidPayload = {
      name: `Finansowanie z błędnymi datami ${Date.now()}`,
      program: "Test Program",
      funder: "Test Funder",
      funding_type: "grant",
      start_date: "2026-12-01",
      end_date: "2026-01-01",
    };

    const response = await request.post(FUNDINGS_URL, {
      headers: { "X-CSRFToken": csrfToken },
      data: invalidPayload,
    });

    expect(
      response.status(),
      `Oczekiwano 400 Bad Request dla end_date < start_date. Otrzymano: ${response.status()}`,
    ).toBe(400);

    const errorBody = await response.json();
    expect(errorBody, "Odpowiedź błędu powinna być obiektem JSON").toBeTruthy();

    const errorString = JSON.stringify(errorBody).toLowerCase();
    const mentionsDates =
      errorString.includes("end_date") ||
      errorString.includes("start_date") ||
      errorString.includes("non_field_errors") ||
      errorString.includes("data");

    expect(
      mentionsDates,
      `Odpowiedź błędu powinna zawierać informację o błędnych datach. ` +
        `Otrzymana odpowiedź: ${JSON.stringify(errorBody)}`,
    ).toBe(true);
  },
);
