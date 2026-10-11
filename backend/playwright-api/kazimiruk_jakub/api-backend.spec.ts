import { test, expect } from "@playwright/test";

test("POST /api/tasks/ z poprawnym tytułem — zwraca 201 i id nowego zadania", async ({ request }) => {
  const state = await request.storageState();
  const csrf = state.cookies.find((c) => c.name === "csrftoken")!.value;

  const response = await request.post("/api/tasks/", {
    headers: { "X-CSRFToken": csrf },
    data: { title: "Zadanie z testu API" },
  });
  expect(response.status()).toBe(201);
  const body = await response.json();
  expect(body).toHaveProperty("id");
  expect(body.title).toBe("Zadanie z testu API");

  await request.delete(`/api/tasks/${body.id}/`, {
    headers: { "X-CSRFToken": csrf },
  });
});

test("GET /api/tasks/ zalogowany admin — zwraca 200 z paginowaną listą zadań", async ({ request }) => {
  const response = await request.get("/api/tasks/");
  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body).toHaveProperty("results");
  expect(Array.isArray(body.results)).toBe(true);
  expect(body).toHaveProperty("count");
});

test("POST /api/tasks/ bez tytułu — backend zwraca 400 Bad Request", async ({ request }) => {
  const state = await request.storageState();
  const csrf = state.cookies.find((c) => c.name === "csrftoken")!.value;

  const response = await request.post("/api/tasks/", {
    headers: { "X-CSRFToken": csrf },
    data: { description: "Brak tytułu" },
  });
  expect(response.status()).toBe(400);
});
