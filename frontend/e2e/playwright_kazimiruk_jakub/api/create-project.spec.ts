import { test, expect } from "@playwright/test";

test("API — POST /api/projects/ tworzy projekt i zwraca id oraz nazwę", async ({
  page,
}) => {
  await page.goto("/dashboard");
  const csrfToken = await page.evaluate(
    () =>
      document.cookie
        .split("; ")
        .find((c) => c.startsWith("csrftoken="))
        ?.split("=")[1] ?? "",
  );

  const createResp = await page.request.post("/api/projects/", {
    headers: { "X-CSRFToken": csrfToken },
    data: { name: "API Test Projekt E2E" },
  });
  expect(createResp.status()).toBe(201);
  const project = await createResp.json();
  expect(project).toHaveProperty("id");
  expect(project.name).toBe("API Test Projekt E2E");

  await page.request.delete(`/api/projects/${project.id}/`, {
    headers: { "X-CSRFToken": csrfToken },
  });
});
