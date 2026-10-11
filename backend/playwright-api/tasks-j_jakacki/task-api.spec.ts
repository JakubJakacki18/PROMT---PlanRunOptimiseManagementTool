import { APIRequestContext, expect, test } from "@playwright/test";

const API_URL = "/api/tasks/";

test.describe("Task API E2E Tests", () => {
  let api: APIRequestContext;
  let taskId: number;

  test.beforeAll(
    "Tworzenie nowego zadania",
    async ({ playwright, request }) => {
      const state = await request.storageState();
      const csrfCookie = state.cookies.find((c) => c.name === "csrftoken");

      if (!csrfCookie) {
        throw new Error(
          "Nie znaleziono ciasteczka csrftoken! Upewnij się, że endpoint ustawia to ciasteczko.",
        );
      }

      api = await playwright.request.newContext({
        extraHTTPHeaders: {
          "X-CSRFToken": csrfCookie.value,
        },
      });

      const response = await api.post(API_URL, {
        data: {
          title: "Analiza architektury systemu",
          description: "Przygotowanie wstępnej dokumentacji dla nowego modułu.",
          status: "todo",
          priority: 2, // Medium
          start_date: "2026-05-01",
          due_date: "2026-05-15",
          est_hours: "12.50",
          cost_amount: "1500.00",
          cost_currency: "PLN",
        },
      });
      expect(response.ok()).toBeTruthy();

      const responseBody = await response.json();

      // Aserty dotyczące zwróconych danych
      expect(responseBody).toHaveProperty("id");
      expect(responseBody.title).toBe("Analiza architektury systemu");
      expect(responseBody.status).toBe("todo");
      expect(responseBody.priority).toBe(2);

      // Zapisujemy ID do wykorzystania w kolejnych testach
      taskId = responseBody.id;
    },
  );

  test.afterAll(async () => {
    await api.dispose();
  });

  test("powinien pobrać szczegóły utworzonego zadania", async () => {
    // Upewniamy się, że mamy ID z poprzedniego testu
    expect(taskId).toBeDefined();

    const response = await api.get(`${API_URL}${taskId}/`);
    expect(response.ok()).toBeTruthy();

    const responseBody = await response.json();
    expect(responseBody.id).toBe(taskId);
    expect(responseBody.title).toBe("Analiza architektury systemu");
  });

  test("powinien zaktualizować status i priorytet zadania", async () => {
    expect(taskId).toBeDefined();

    const response = await api.patch(`${API_URL}${taskId}/`, {
      data: {
        status: "doing",
        priority: 3,
      },
    });

    expect(response.ok()).toBeTruthy();

    const responseBody = await response.json();
    expect(responseBody.status).toBe("doing");
    expect(responseBody.priority).toBe(3);
  });

  test("nie powinien pozwolić na utworzenie zadania, gdzie start_date > due_date", async () => {
    const response = await api.post(API_URL, {
      data: {
        title: "Zadanie z podróżą w czasie",
        start_date: "2026-06-10",
        due_date: "2026-06-01",
      },
    });
    expect(response.status()).toBe(400);
  });

  test("powinien usunąć zadanie i zwrócić 404 przy ponownej próbie pobrania", async () => {
    expect(taskId).toBeDefined();
    const deleteResponse = await api.delete(`${API_URL}${taskId}/`);
    expect(deleteResponse.ok()).toBeTruthy();
    const getResponse = await api.get(`${API_URL}${taskId}/`);
    expect(getResponse.status()).toBe(404);
  });
});
