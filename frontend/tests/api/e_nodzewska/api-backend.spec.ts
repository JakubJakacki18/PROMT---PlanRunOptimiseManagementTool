import { test, expect } from "@playwright/test";

// Emilia Nodzewska
test("GET /api/health/ zwraca 200 i status ok", async ({ request }) => {
  const response = await request.get("/api/health/");
  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body).toEqual({ status: "ok" });
});

test("GET /api/projects/ zalogowany admin — zwraca 200 z kluczem results", async ({
  request,
}) => {
  const response = await request.get("/api/projects/");
  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body).toHaveProperty("results");
  expect(Array.isArray(body.results)).toBe(true);
});
