import { APIRequestContext, expect, test } from "@playwright/test";

const USERS_URL = "/api/users/";
const ME_URL = "/api/auth/me/";

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
  opts: {
    roleSuffix?: string;
    phone?: string;
    avatar_url?: string;
  } = {},
): Promise<{ id: number; username: string }> {
  const { roleSuffix = "member", phone = "", avatar_url = "" } = opts;
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
      phone,
      avatar_url,
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

// ── UWAGA: UserViewSet ma pagination_class = None, więc /api/users/ zwraca
//          PŁASKĄ TABLICĘ, a nie obiekt {count, results}. ──────────────────

test(
  "GET /api/users/ — admin otrzymuje 200 z płaską tablicą użytkowników, każdy ma 'id', 'username', 'email' oraz zagnieżdżone pole 'profile'",
  async ({ request }) => {
    const response = await request.get(USERS_URL);

    expect(
      response.status(),
      `GET /api/users/ powinien zwrócić 200 OK dla admina. Otrzymano: ${response.status()}`,
    ).toBe(200);

    const body = await response.json();

    expect(
      Array.isArray(body),
      "Endpoint /api/users/ zwraca płaską tablicę (pagination_class = None w UserViewSet)",
    ).toBe(true);

    expect(
      body.length,
      "Lista użytkowników powinna zawierać przynajmniej jednego użytkownika (admina)",
    ).toBeGreaterThanOrEqual(1);

    const firstUser = body[0];

    expect(firstUser, "Obiekt użytkownika musi mieć pole 'id'").toHaveProperty("id");
    expect(firstUser, "Obiekt użytkownika musi mieć pole 'username'").toHaveProperty("username");
    expect(firstUser, "Obiekt użytkownika musi mieć pole 'email'").toHaveProperty("email");
    expect(firstUser, "Obiekt użytkownika musi mieć zagnieżdżone pole 'profile'").toHaveProperty("profile");

    expect(
      typeof firstUser.id === "number" && firstUser.id > 0,
      `Pole 'id' powinno być dodatnią liczbą całkowitą, otrzymano: ${firstUser.id}`,
    ).toBe(true);
    expect(
      typeof firstUser.username === "string" && firstUser.username.length > 0,
      `Pole 'username' powinno być niepustym stringiem, otrzymano: ${firstUser.username}`,
    ).toBe(true);

    expect(firstUser.profile, "Pole 'profile' powinno mieć pole 'role'").toHaveProperty("role");

    const validRoles = ["admin", "pm", "member", "viewer"];
    expect(
      validRoles.includes(firstUser.profile.role),
      `profile.role powinno być jedną z wartości ${validRoles.join(", ")}, otrzymano: ${firstUser.profile.role}`,
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
    // Rola jest zagnieżdżona w profile (UserSerializer zwraca profile.role)
    expect(
      created.profile?.role,
      "Rola powinna być widoczna w polu profile.role, nie na poziomie głównym obiektu",
    ).toBe("member");
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

    // Po PATCH sprawdzamy persystencję przez GET — UserDetailSerializer zwraca profile.role
    const getAfterPatchResponse = await request.get(`${USERS_URL}${userId}/`);
    expect(getAfterPatchResponse.status()).toBe(200);
    const fetched = await getAfterPatchResponse.json();
    expect(
      fetched.profile?.role,
      "Zmiana roli powinna być persystentna — GET po PATCH powinien zwrócić 'manager' w profile.role",
    ).toBe("manager");
    expect(fetched.username).toBe(username);
    expect(fetched.email).toBe(createPayload.email);

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
    const { id: userId, username } = await createTestUser(request, csrfToken);

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

test(
  "GET /api/users/:id/ — zwraca UserDetailSerializer z polem 'tasks' (lista zadań użytkownika)",
  async ({ request }) => {
    const listResponse = await request.get(USERS_URL);
    expect(listResponse.status()).toBe(200);

    const users = await listResponse.json();
    expect(Array.isArray(users) && users.length > 0).toBe(true);

    const firstUserId: number = users[0].id;
    const detailResponse = await request.get(`${USERS_URL}${firstUserId}/`);

    expect(
      detailResponse.status(),
      `GET /api/users/${firstUserId}/ powinien zwrócić 200 OK`,
    ).toBe(200);

    const detail = await detailResponse.json();

    expect(detail).toHaveProperty("id");
    expect(detail.id).toBe(firstUserId);
    expect(detail).toHaveProperty("username");
    expect(detail).toHaveProperty("email");
    expect(detail).toHaveProperty("profile");
    expect(detail.profile).toHaveProperty("role");
    expect(detail.profile).toHaveProperty("phone");
    expect(detail.profile).toHaveProperty("avatar_url");

    // UserDetailSerializer ma dodatkowe pole 'tasks' nieobecne w liście
    expect(
      detail,
      "Endpoint szczegółowy /api/users/:id/ powinien zwracać pole 'tasks' (UserDetailSerializer)",
    ).toHaveProperty("tasks");
    expect(
      Array.isArray(detail.tasks),
      "Pole 'tasks' powinno być tablicą",
    ).toBe(true);

    expect(detail, "BEZPIECZEŃSTWO: Pole 'password' nie może być obecne").not.toHaveProperty("password");
  },
);

test(
  "GET /api/auth/me/ — zwraca dane zalogowanego admina z polami id, username, email, is_staff, role",
  async ({ request }) => {
    const response = await request.get(ME_URL);

    expect(
      response.status(),
      `GET /api/auth/me/ powinien zwrócić 200 OK. Otrzymano: ${response.status()}`,
    ).toBe(200);

    const me = await response.json();

    expect(me).toHaveProperty("id");
    expect(me).toHaveProperty("username");
    expect(me).toHaveProperty("email");
    expect(me).toHaveProperty("is_staff");
    expect(me).toHaveProperty("role");

    expect(
      me.is_staff,
      "Zalogowany użytkownik (admin) powinien mieć is_staff: true",
    ).toBe(true);

    expect(
      typeof me.id === "number" && me.id > 0,
      `Pole 'id' powinno być dodatnim int, otrzymano: ${me.id}`,
    ).toBe(true);
    expect(
      typeof me.username === "string" && me.username.length > 0,
      `Pole 'username' powinno być niepustym stringiem, otrzymano: ${me.username}`,
    ).toBe(true);

    expect(me, "BEZPIECZEŃSTWO: /api/auth/me/ nie może ujawniać hasła").not.toHaveProperty("password");
  },
);

test(
  "PATCH /api/users/:id/ — aktualizuje pola profilu: phone i avatar_url",
  async ({ request }) => {
    const csrfToken = await getCsrfToken(request);
    const { id: userId } = await createTestUser(request, csrfToken);

    try {
      const newPhone = "+48987654321";
      const newAvatar = "https://avatars.testpromt.pl/playwright.png";

      const patchResponse = await request.patch(`${USERS_URL}${userId}/`, {
        headers: { "X-CSRFToken": csrfToken },
        data: { phone: newPhone, avatar_url: newAvatar },
      });

      expect(
        patchResponse.status(),
        `PATCH /api/users/${userId}/ powinien zwrócić 200 OK. Otrzymano: ${patchResponse.status()}`,
      ).toBe(200);

      // Weryfikujemy persystencję przez GET (UserDetailSerializer)
      const getResponse = await request.get(`${USERS_URL}${userId}/`);
      expect(getResponse.status()).toBe(200);
      const detail = await getResponse.json();

      expect(
        detail.profile?.phone,
        `phone w profilu powinien być "${newPhone}" po PATCH`,
      ).toBe(newPhone);
      expect(
        detail.profile?.avatar_url,
        `avatar_url w profilu powinien być "${newAvatar}" po PATCH`,
      ).toBe(newAvatar);
    } finally {
      await request.delete(`${USERS_URL}${userId}/`, {
        headers: { "X-CSRFToken": csrfToken },
      });
    }
  },
);

test(
  "POST /api/users/ bez wymaganego pola 'username' — backend zwraca 400 Bad Request",
  async ({ request }) => {
    const csrfToken = await getCsrfToken(request);

    const response = await request.post(USERS_URL, {
      headers: { "X-CSRFToken": csrfToken },
      data: {
        email: "noname@testpromt.pl",
        password: "SomePassword123!",
        role: "member",
      },
    });

    expect(
      response.status(),
      `POST bez pola 'username' powinien zwrócić 400 Bad Request. Otrzymano: ${response.status()}`,
    ).toBe(400);

    const errorBody = await response.json();
    const errorStr = JSON.stringify(errorBody).toLowerCase();
    expect(
      errorStr.includes("username") || errorStr.includes("wymagane") || errorStr.includes("required"),
      `Odpowiedź błędu powinna wskazywać na brakujące pole 'username'. Otrzymano: ${JSON.stringify(errorBody)}`,
    ).toBe(true);
  },
);

test(
  "PATCH /api/users/:id/ z nieprawidłowym numerem telefonu — backend zwraca 400",
  async ({ request }) => {
    const csrfToken = await getCsrfToken(request);
    const { id: userId } = await createTestUser(request, csrfToken);

    try {
      const response = await request.patch(`${USERS_URL}${userId}/`, {
        headers: { "X-CSRFToken": csrfToken },
        // Telefon za krótki (walidator wymaga 7–15 cyfr)
        data: { phone: "123" },
      });

      expect(
        response.status(),
        `PATCH z numerem telefonu '123' (za krótki) powinien zwrócić 400 Bad Request. Otrzymano: ${response.status()}`,
      ).toBe(400);

      const errorBody = await response.json();
      const errorStr = JSON.stringify(errorBody).toLowerCase();
      expect(
        errorStr.includes("phone") || errorStr.includes("telefon") || errorStr.includes("digit"),
        `Odpowiedź błędu powinna wskazywać na nieprawidłowy numer telefonu. Otrzymano: ${JSON.stringify(errorBody)}`,
      ).toBe(true);
    } finally {
      await request.delete(`${USERS_URL}${userId}/`, {
        headers: { "X-CSRFToken": csrfToken },
      });
    }
  },
);

test(
  "PATCH /api/users/:id/ z nieprawidłowym avatar_url — backend zwraca 400",
  async ({ request }) => {
    const csrfToken = await getCsrfToken(request);
    const { id: userId } = await createTestUser(request, csrfToken);

    try {
      const response = await request.patch(`${USERS_URL}${userId}/`, {
        headers: { "X-CSRFToken": csrfToken },
        data: { avatar_url: "nie-to-jest-url" },
      });

      expect(
        response.status(),
        `PATCH z nieprawidłowym avatar_url powinien zwrócić 400 Bad Request. Otrzymano: ${response.status()}`,
      ).toBe(400);

      const errorBody = await response.json();
      const errorStr = JSON.stringify(errorBody).toLowerCase();
      expect(
        errorStr.includes("avatar") || errorStr.includes("url") || errorStr.includes("valid"),
        `Odpowiedź błędu powinna wskazywać na nieprawidłowy URL avatara. Otrzymano: ${JSON.stringify(errorBody)}`,
      ).toBe(true);
    } finally {
      await request.delete(`${USERS_URL}${userId}/`, {
        headers: { "X-CSRFToken": csrfToken },
      });
    }
  },
);

test(
  "DELETE /api/users/:id/ na samym sobie (admin) — backend zwraca błąd i nie pozwala na samousunięcie",
  async ({ request }) => {
    const meResponse = await request.get(ME_URL);
    expect(meResponse.status()).toBe(200);
    const me = await meResponse.json();
    const csrfToken = await getCsrfToken(request);

    const deleteResponse = await request.delete(`${USERS_URL}${me.id}/`, {
      headers: { "X-CSRFToken": csrfToken },
    });

    expect(
      deleteResponse.ok(),
      `Admin nie powinien móc usunąć samego siebie — oczekiwano błędu 4xx, otrzymano: ${deleteResponse.status()}`,
    ).toBe(false);

    expect(
      deleteResponse.status(),
      `Oczekiwano 400 Bad Request przy próbie samousunięcia. Otrzymano: ${deleteResponse.status()}`,
    ).toBe(400);
  },
);

test(
  "PATCH /api/users/:id/ — aktualizuje first_name i last_name, zmiany są persystentne",
  async ({ request }) => {
    const csrfToken = await getCsrfToken(request);
    const { id: userId } = await createTestUser(request, csrfToken);

    try {
      const patchResponse = await request.patch(`${USERS_URL}${userId}/`, {
        headers: { "X-CSRFToken": csrfToken },
        data: { first_name: "Nowe", last_name: "Nazwisko" },
      });

      expect(
        patchResponse.status(),
        `PATCH powinien zwrócić 200 OK. Otrzymano: ${patchResponse.status()}`,
      ).toBe(200);

      const getResponse = await request.get(`${USERS_URL}${userId}/`);
      const detail = await getResponse.json();

      expect(detail.first_name).toBe("Nowe");
      expect(detail.last_name).toBe("Nazwisko");
    } finally {
      await request.delete(`${USERS_URL}${userId}/`, {
        headers: { "X-CSRFToken": csrfToken },
      });
    }
  },
);

test(
  "GET /api/task-assignments/?user=:id — zwraca 200 z listą przypisań dla danego użytkownika",
  async ({ request }) => {
    const meResponse = await request.get(ME_URL);
    const me = await meResponse.json();

    const response = await request.get(`/api/task-assignments/?user=${me.id}`);

    expect(
      response.status(),
      `GET /api/task-assignments/?user=${me.id} powinien zwrócić 200 OK`,
    ).toBe(200);

    const body = await response.json();

    expect(Array.isArray(body), "Odpowiedź powinna być tablicą przypisań").toBe(true);

    for (const assignment of body) {
      expect(assignment, "Każde przypisanie musi mieć pole 'id'").toHaveProperty("id");
      expect(assignment, "Każde przypisanie musi mieć pole 'task'").toHaveProperty("task");
      expect(assignment, "Każde przypisanie musi mieć pole 'user'").toHaveProperty("user");
      expect(
        assignment.user,
        "Pole 'user' każdego przypisania powinno odpowiadać id filtrowanego użytkownika",
      ).toBe(me.id);
    }
  },
);
