// @vitest-environment node
import { describe, it, expect } from "vitest";

import {
  titleField,
  estHoursField,
  validateDateRange,
} from "../taskValidation";
import { filterTasksByAssignee, isStatusBackward } from "../taskUtils";
import { buildCycleBuckets, computeMedian } from "../../projects/deliveryUtils";
import type { Task } from "../types";

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 1,
    title: "Testowe zadanie",
    status: "todo",
    priority: 2,
    start_date: null,
    due_date: null,
    cost_amount: null,
    cost_currency: "PLN",
    receipt_url: "",
    receipt_note: "",
    est_hours: null,
    template: null,
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
    scope_project: null,
    scope_funding: null,
    scope_project_funding: null,
    assignees: [],
    ...overrides,
  };
}

describe("TC-F-01: Walidacja tytułu — tytuł pusty", () => {
  it('title="" → błąd walidacji', () => {
    const result = titleField.safeParse("");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe(
        "Tytuł musi mieć min. 3 znaki"
      );
    }
  });
});

describe("TC-F-03: Walidacja tytułu — tytuł 3 znaki (granica min)", () => {
  it('title="abc" → walidacja przechodzi', () => {
    const result = titleField.safeParse("abc");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe("abc");
    }
  });
});

describe("TC-F-04: Walidacja szacowanego czasu — wartość ujemna", () => {
  it('est_hours="-1" → błąd walidacji', () => {
    const result = estHoursField.safeParse("-1");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe(
        "Szacowany czas musi być ≥ 0"
      );
    }
  });
});

describe("TC-F-08: Walidacja dat — start_date > due_date", () => {
  it("start > due → validateDateRange zwraca false", () => {
    expect(validateDateRange("2025-04-01", "2025-03-01")).toBe(false);
  });
});

describe("TC-F-11: Przypisanie — osoba_przypisana.length = 2", () => {
  it("zadanie z 2 przypisanymi osobami jest zwracane przez filtr", () => {
    const userA = { id: 1, username: "anna" };
    const userB = { id: 2, username: "bartek" };
    const task = makeTask({ id: 10, assignees: [userA, userB] as any });

    const result = filterTasksByAssignee([task], userA.id);
    expect(result).toHaveLength(1);
    expect(result[0].assignees).toHaveLength(2);
  });
});

describe("TC-F-12: Edycja — zmiana statusu wstecz", () => {
  it("done → todo → isStatusBackward = true", () => {
    expect(isStatusBackward("done", "todo")).toBe(true);
  });
});

describe("TC-F-15: Filtrowanie — po osobie przypisanej", () => {
  const userA = { id: 1, username: "anna" };
  const userB = { id: 2, username: "bartek" };

  const tasks: Task[] = [
    makeTask({ id: 1, title: "Zadanie Anny", assignees: [userA] as any }),
    makeTask({ id: 2, title: "Zadanie Bartka", assignees: [userB] as any }),
    makeTask({ id: 3, title: "Wspólne", assignees: [userA, userB] as any }),
    makeTask({ id: 4, title: "Nieprzypisane", assignees: [] }),
  ];

  it("filtr po userId=1 → zwraca zadania Anny (id: 1 i 3)", () => {
    const result = filterTasksByAssignee(tasks, 1);
    expect(result).toHaveLength(2);
    expect(result.map((t) => t.id)).toEqual(expect.arrayContaining([1, 3]));
  });
});

describe("TC-F-26: Grupowanie — kubełki czasu realizacji", () => {
  it('durations=[0,1] → kubełek "0–1d" count=2', () => {
    const buckets = buildCycleBuckets([0, 1]);
    expect(buckets.find((b) => b.label === "0–1d")?.count).toBe(2);
  });
});

describe("TC-F-28: Grupowanie — kubełki czasu realizacji", () => {
  it('durations=[8,15] → kubełek "8+d" count=2', () => {
    const buckets = buildCycleBuckets([8, 15]);
    expect(buckets.find((b) => b.label === "8+d")?.count).toBe(2);
  });
});

describe("TC-F-29: Obliczanie — mediana czasu realizacji", () => {
  it("nieparzysta [1,3,5] → mediana = 3", () => {
    expect(computeMedian([1, 3, 5])).toBe(3);
  });
});
