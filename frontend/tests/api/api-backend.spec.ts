import { test, expect } from "@playwright/test";

test("GET /api/health/ zwraca 200 i status ok", async ({ request }) => {
  const response = await request.get("/api/health/");
  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body).toEqual({ status: "ok" });
});

test("GET /api/projects/ zalogowany admin — zwraca 200 z kluczem results", async ({ request }) => {
  const response = await request.get("/api/projects/");
  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body).toHaveProperty("results");
  expect(Array.isArray(body.results)).toBe(true);
});

test("POST /api/tasks/ z poprawnym tytułem — zwraca 201 i id nowego zadania", async ({ request }) => {
  const response = await request.post("/api/tasks/", {
    data: { title: "Zadanie z testu API" },
  });
  expect(response.status()).toBe(201);
  const body = await response.json();
  expect(body).toHaveProperty("id");
  expect(body.title).toBe("Zadanie z testu API");
});
