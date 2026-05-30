import { APIRequestContext, expect, test } from "@playwright/test";

const USERS_URL = "/api/users/";

async function getCsrfToken(request: APIRequestContext): Promise<string> {
  const state = await request.storageState();
  const cookie = state.cookies.find((c) => c.name === "csrftoken");
  if (!cookie) {
    throw new Error(
      "Brak ciasteczka 'csrftoken' w storageState. " +
        "Upewnij się, że skrypt auth.setup.ts wykonał się poprawnie " +
        "i że projekt 'chromium' zależy od projektu 'setup'.",
    );
  }
  return cookie.value;
}

async function createTestUser(
  request: APIRequestContext,
  csrfToken: string,
  roleSuffix: string = "member",
): Promise<{ id: number; username: string }> {
  const username = `playwright_turek_${roleSuffix}_${Date.now()}`;

  const response = await request.post(USERS_URL, {
    headers: { "X-CSRFToken": csrfToken },
    data: {
      username,
      email: `${username}@testpromt.pl`,
      first_name: "Playwright",
      last_name: "Turkowicz",
      password: "SecureTestPass123!",
      role: roleSuffix === "manager" ? "manager" : "member",
    },
  });

  if (!response.ok()) {
    const body = await response.text();
    throw new Error(
      `Nie można stworzyć użytkownika pomocniczego '${username}'. ` +
        `Status: ${response.status()}, Odpowiedź: ${body}`,
    );
  }

  const body = await response.json();
  return { id: body.id as number, username };
}

test(
  "GET /api/users/ — admin otrzymuje 200 z paginowaną listą zawierającą pole results oraz dane każdego usera",
  async ({ request }) => {
    const response = await request.get(USERS_URL);

    expect(
      response.status(),
      `GET /api/users/ powinien zwrócić 200 OK dla admina. Otrzymano: ${response.status()}`,
    ).toBe(200);

    const body = await response.json();

    expect(body).toHaveProperty("count");
    expect(body).toHaveProperty("results");
    expect(Array.isArray(body.results)).toBe(true);

    expect(
      body.count,
      "Lista użytkowników powinna zawierać przynajmniej jednego użytkownika (admina)",
    ).toBeGreaterThanOrEqual(1);

    const firstUser = body.results[0];

    expect(firstUser, "Obiekt użytkownika musi mieć pole 'id'").toHaveProperty("id");
    expect(firstUser, "Obiekt użytkownika musi mieć pole 'username'").toHaveProperty("username");
    expect(firstUser, "Obiekt użytkownika musi mieć pole 'email'").toHaveProperty("email");

    expect(
      typeof firstUser.id === "number" && firstUser.id > 0,
      `Pole 'id' powinno być dodatnią liczbą całkowitą, otrzymano: ${firstUser.id}`,
    ).toBe(true);
    expect(
      typeof firstUser.username === "string" && firstUser.username.length > 0,
      `Pole 'username' powinno być niepustym stringiem, otrzymano: ${firstUser.username}`,
    ).toBe(true);

    expect(
      firstUser,
      "BEZPIECZEŃSTWO: Pole 'password' nie powinno być obecne w odpowiedzi GET /api/users/",
    ).not.toHaveProperty("password");
  },
);

test(
  "POST /api/users/ tworzy nowego użytkownika z rolą member, " +
    "PATCH /api/users/:id/ zmienia rolę na manager, DELETE usuwa użytkownika",
  async ({ request }) => {
    const csrfToken = await getCsrfToken(request);
    const uniqueTs = Date.now();
    const username = `playwright_turek_lifecycle_${uniqueTs}`;

    const createPayload = {
      username,
      email: `${username}@testpromt.pl`,
      first_name: "Marek",
      last_name: "Testowy",
      password: "TurkowiczTestPass!99",
      role: "member",
    };

    const createResponse = await request.post(USERS_URL, {
      headers: { "X-CSRFToken": csrfToken },
      data: createPayload,
    });

    expect(
      createResponse.status(),
      `POST /api/users/ powinien zwrócić 201 Created. Otrzymano: ${createResponse.status()}`,
    ).toBe(201);

    const created = await createResponse.json();

    expect(created).toHaveProperty("id");
    expect(typeof created.id === "number" && created.id > 0).toBe(true);
    expect(created.username).toBe(username);
    expect(created.email).toBe(createPayload.email);
    expect(created.role).toBe("member");
    expect(created, "Hasło nie może być ujawnione w odpowiedzi POST").not.toHaveProperty("password");

    const userId = created.id;

    const patchResponse = await request.patch(`${USERS_URL}${userId}/`, {
      headers: { "X-CSRFToken": csrfToken },
      data: { role: "manager" },
    });

    expect(
      patchResponse.status(),
      `PATCH /api/users/${userId}/ powinien zwrócić 200 OK. Otrzymano: ${patchResponse.status()}`,
    ).toBe(200);

    const patched = await patchResponse.json();
    expect(patched.role, "Rola użytkownika powinna zostać zmieniona na 'manager'").toBe("manager");
    expect(patched.username).toBe(username);
    expect(patched.email).toBe(createPayload.email);

    const getResponse = await request.get(`${USERS_URL}${userId}/`);
    expect(getResponse.status()).toBe(200);
    const fetched = await getResponse.json();
    expect(
      fetched.role,
      "Zmiana roli powinna być persystentna — GET po PATCH powinien zwrócić nową rolę",
    ).toBe("manager");

    const deleteResponse = await request.delete(`${USERS_URL}${userId}/`, {
      headers: { "X-CSRFToken": csrfToken },
    });

    expect(
      deleteResponse.ok(),
      `DELETE /api/users/${userId}/ powinien zakończyć się sukcesem (2xx). Otrzymano: ${deleteResponse.status()}`,
    ).toBeTruthy();

    const afterDeleteResponse = await request.get(`${USERS_URL}${userId}/`);
    expect(
      afterDeleteResponse.status(),
      `Po usunięciu GET /api/users/${userId}/ powinien zwrócić 404 Not Found`,
    ).toBe(404);
  },
);

test(
  "POST /api/users/ z już istniejącą nazwą użytkownika — backend zwraca 400 z informacją o duplikacie",
  async ({ request }) => {
    const csrfToken = await getCsrfToken(request);
    const { id: userId, username } = await createTestUser(request, csrfToken, "member");

    try {
      const duplicateResponse = await request.post(USERS_URL, {
        headers: { "X-CSRFToken": csrfToken },
        data: {
          username,
          email: `duplicate_${Date.now()}@testpromt.pl`,
          password: "AnyPassword123!",
          role: "member",
        },
      });

      expect(
        duplicateResponse.status(),
        `Drugi POST z tym samym username '${username}' powinien zwrócić 400 Bad Request. Otrzymano: ${duplicateResponse.status()}`,
      ).toBe(400);

      const errorBody = await duplicateResponse.json();
      expect(errorBody, "Odpowiedź błędu powinna być obiektem JSON").toBeTruthy();

      const errorStr = JSON.stringify(errorBody).toLowerCase();
      const mentionsUsername =
        errorStr.includes("username") ||
        errorStr.includes("already exists") ||
        errorStr.includes("musi być unikatow") ||
        errorStr.includes("użytkownik o tej nazwie");

      expect(
        mentionsUsername,
        `Odpowiedź błędu powinna zawierać informację o duplikacie username. ` +
          `Otrzymana odpowiedź: ${JSON.stringify(errorBody)}`,
      ).toBe(true);
    } finally {
      await request.delete(`${USERS_URL}${userId}/`, {
        headers: { "X-CSRFToken": csrfToken },
      });
    }
  },
);
