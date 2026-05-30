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

test("POST /api/projects/ tworzy projekt, GET go pobiera, DELETE usuwa — cykl życia zasobu", async ({
  request,
}) => {
  const state = await request.storageState();
  const csrf = state.cookies.find((c) => c.name === "csrftoken")!.value;

  const createResp = await request.post("/api/projects/", {
    headers: { "X-CSRFToken": csrf },
    data: { name: "Projekt Nodzewska E2E" },
  });
  expect(createResp.status()).toBe(201);
  const project = await createResp.json();
  expect(project).toHaveProperty("id");
  expect(project.name).toBe("Projekt Nodzewska E2E");

  const getResp = await request.get(`/api/projects/${project.id}/`);
  expect(getResp.status()).toBe(200);
  const fetched = await getResp.json();
  expect(fetched.id).toBe(project.id);

  const delResp = await request.delete(`/api/projects/${project.id}/`, {
    headers: { "X-CSRFToken": csrf },
  });
  expect(delResp.ok()).toBeTruthy();

  const afterDel = await request.get(`/api/projects/${project.id}/`);
  expect(afterDel.status()).toBe(404);
});
