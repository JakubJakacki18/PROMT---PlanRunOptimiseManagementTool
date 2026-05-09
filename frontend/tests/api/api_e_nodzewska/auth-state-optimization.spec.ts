import { test, expect } from "@playwright/test";

test("storageState — sesja admina pozwala odpytać /api/auth/me/ i /api/projects/ bez logowania przez UI", async ({
  page,
}) => {
  const meResp = await page.request.get("/api/auth/me/");
  expect(meResp.status()).toBe(200);
  const me = await meResp.json();
  expect(me).toHaveProperty("username");
  expect(me.is_staff).toBe(true);

  const projectsResp = await page.request.get("/api/projects/");
  expect(projectsResp.status()).toBe(200);
  const projects = await projectsResp.json();
  expect(projects).toHaveProperty("results");
});
