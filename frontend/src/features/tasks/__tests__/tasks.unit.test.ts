import { describe, it, expect } from "vitest";

import {
  titleField,
  estHoursField,
  validateDateRange,
} from "../taskValidation";
import { filterTasksByAssignee, isStatusBackward } from "../taskUtils";
import {
  filterByStatus,
  filterByPriority,
  filterNoDueDate,
  filterOverdue,
  filterDueToday,
  filterDueThisWeek,
} from "../taskFilters";
import {
  buildCycleBuckets,
  computeMedian,
  computeAverage,
} from "../../projects/deliveryUtils";
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

describe("Walidacja tytułu", () => {
  it('title="" → błąd walidacji', () => {
    const result = titleField.safeParse("");
    expect(result.success).toBe(false);
    if (!result.success)
      expect(result.error.issues[0].message).toBe("Tytuł musi mieć min. 3 znaki");
  });

  it('title="a" (1 znak) → błąd walidacji', () => {
    const result = titleField.safeParse("a");
    expect(result.success).toBe(false);
  });

  it('title="abc" (3 znaki, granica min) → walidacja przechodzi', () => {
    const result = titleField.safeParse("abc");
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBe("abc");
  });
});

describe("Walidacja szacowanego czasu (estHoursField)", () => {
  it("est_hours=-1 → błąd walidacji", () => {
    const result = estHoursField.safeParse("-1");
    expect(result.success).toBe(false);
    if (!result.success)
      expect(result.error.issues[0].message).toBe("Szacowany czas musi być ≥ 0");
  });

  it("est_hours=0 → wg kodu walidacja przechodzi (>= 0)", () => {
    const result = estHoursField.safeParse("0");
    expect(result.success).toBe(true); // kod: parseFloat("0") >= 0 → true
  });

  it("est_hours=0.5 → wg kodu walidacja przechodzi (0.5 >= 0)", () => {
    const result = estHoursField.safeParse("0.5");
    expect(result.success).toBe(true); // kod: parseFloat("0.5") >= 0 → true
  });

  it("est_hours=1 → walidacja przechodzi", () => {
    const result = estHoursField.safeParse("1");
    expect(result.success).toBe(true);
  });
});

describe("Walidacja dat (validateDateRange)", () => {
  it("start > due → false (błąd)", () => {
    expect(validateDateRange("2025-04-01", "2025-03-01")).toBe(false);
  });

  it("start = due → true (OK)", () => {
    expect(validateDateRange("2025-04-01", "2025-04-01")).toBe(true);
  });
});

describe("Przypisanie osób (filterTasksByAssignee)", () => {
  const userA = { id: 1, username: "anna" };
  const userB = { id: 2, username: "bartek" };

  it("zadanie bez assignees → nie zwracane przez filtr (length=0)", () => {
    const task = makeTask({ id: 5, assignees: [] });
    const result = filterTasksByAssignee([task], userA.id);
    expect(result).toHaveLength(0);
  });

  it("zadanie z 2 assignees → zwracane przez filtr dla obu userów", () => {
    const task = makeTask({ id: 10, assignees: [userA, userB] as any });
    expect(filterTasksByAssignee([task], userA.id)).toHaveLength(1);
    expect(filterTasksByAssignee([task], userB.id)).toHaveLength(1);
    expect(filterTasksByAssignee([task], userA.id)[0].assignees).toHaveLength(2);
  });
});

describe("Edycja — logika statusów (isStatusBackward)", () => {
  it("done → todo (wstecz) → isStatusBackward = true", () => {
    expect(isStatusBackward("done", "todo")).toBe(true);
  });

  it("done → done (brak zmiany) → isStatusBackward = false", () => {
    expect(isStatusBackward("done", "done")).toBe(false);
  });

  it("todo → doing (do przodu) → isStatusBackward = false", () => {
    expect(isStatusBackward("todo", "doing")).toBe(false);
  });
});

describe("Filtr — po osobie przypisanej (filterTasksByAssignee)", () => {
  const userA = { id: 1, username: "anna" };
  const userB = { id: 2, username: "bartek" };
  const tasks: Task[] = [
    makeTask({ id: 1, assignees: [userA] as any }),
    makeTask({ id: 2, assignees: [userB] as any }),
    makeTask({ id: 3, assignees: [userA, userB] as any }),
    makeTask({ id: 4, assignees: [] }),
  ];

  it("filtr po userId=1 → zwraca zadania id:1 i id:3", () => {
    const result = filterTasksByAssignee(tasks, 1);
    expect(result).toHaveLength(2);
    expect(result.map((t) => t.id)).toEqual(expect.arrayContaining([1, 3]));
  });
});

describe("Filtr — po statusie (filterByStatus)", () => {
  const tasks: Task[] = [
    makeTask({ id: 1, status: "todo" }),
    makeTask({ id: 2, status: "doing" }),
    makeTask({ id: 3, status: "done" }),
    makeTask({ id: 4, status: "todo" }),
  ];

  it("filter: do zrobienia → zadania o statusie todo", () => {
    const result = filterByStatus(tasks, "todo");
    expect(result).toHaveLength(2);
    result.forEach((t) => expect(t.status).toBe("todo"));
  });

  it("filter: w trakcie → zadania o statusie doing", () => {
    const result = filterByStatus(tasks, "doing");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(2);
  });

  it("filter: zrobione → zadania o statusie done", () => {
    const result = filterByStatus(tasks, "done");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(3);
  });
});

describe("Filtr — po priorytecie (filterByPriority)", () => {
  const tasks: Task[] = [
    makeTask({ id: 1, priority: 1 }),
    makeTask({ id: 2, priority: 2 }),
    makeTask({ id: 3, priority: 3 }),
    makeTask({ id: 4, priority: 2 }),
  ];

  it("filter: niski (1) → zadania z priorytetem 1", () => {
    const result = filterByPriority(tasks, [1]);
    expect(result).toHaveLength(1);
    expect(result[0].priority).toBe(1);
  });

  it("filter: średni (2) → zadania z priorytetem 2", () => {
    const result = filterByPriority(tasks, [2]);
    expect(result).toHaveLength(2);
    result.forEach((t) => expect(t.priority).toBe(2));
  });

  it("filter: wysoki (3) → zadania z priorytetem 3", () => {
    const result = filterByPriority(tasks, [3]);
    expect(result).toHaveLength(1);
    expect(result[0].priority).toBe(3);
  });
});

describe("Filtr — zaległe (filterOverdue)", () => {
  const today = new Date("2025-06-15");

  it("zadanie z start_date przed dziś (nie done) → zaległe", () => {
    const tasks: Task[] = [
      makeTask({ id: 1, status: "todo", start_date: "2025-06-01" }),
      makeTask({ id: 2, status: "done", start_date: "2025-06-01" }),
      makeTask({ id: 3, status: "todo", start_date: "2025-06-20" }),
    ];
    const result = filterOverdue(tasks, today);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(1);
  });
});

describe("Filtr — termin dzisiaj (filterDueToday)", () => {
  const today = new Date("2025-06-15T12:00:00");

  it("zadanie z due_date = dzisiaj → w filtrze", () => {
    const tasks: Task[] = [
      makeTask({ id: 1, due_date: "2025-06-15" }),
      makeTask({ id: 2, due_date: "2025-06-14" }),
      makeTask({ id: 3, due_date: "2025-06-16" }),
    ];
    const result = filterDueToday(tasks, today);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(1);
  });
});

describe("Filtr — termin w tym tygodniu (filterDueThisWeek)", () => {
  const today = new Date("2025-06-15T12:00:00"); 
  it("zadanie z due_date w bieżącym tygodniu → w filtrze", () => {
    const tasks: Task[] = [
      makeTask({ id: 1, due_date: "2025-06-10" }),
      makeTask({ id: 2, due_date: "2025-06-15" }),
      makeTask({ id: 3, due_date: "2025-06-16" }),
      makeTask({ id: 4, due_date: "2025-06-08" }),
    ];
    const result = filterDueThisWeek(tasks, today);
    expect(result.map((t) => t.id)).toEqual(expect.arrayContaining([1, 2]));
    expect(result.map((t) => t.id)).not.toContain(3);
    expect(result.map((t) => t.id)).not.toContain(4);
  });
});

describe("Filtr — bez terminu (filterNoDueDate)", () => {
  it("zadania bez due_date → tylko one w wynikach", () => {
    const tasks: Task[] = [
      makeTask({ id: 1, due_date: null }),
      makeTask({ id: 2, due_date: "2025-06-15" }),
      makeTask({ id: 3, due_date: null }),
    ];
    const result = filterNoDueDate(tasks);
    expect(result).toHaveLength(2);
    expect(result.map((t) => t.id)).toEqual(expect.arrayContaining([1, 3]));
  });
});

describe("Grupowanie kubełkami (buildCycleBuckets)", () => {
  it("durations=[0,1] → kubełek '0–1d' count=2", () => {
    const buckets = buildCycleBuckets([0, 1]);
    expect(buckets.find((b) => b.label === "0–1d")?.count).toBe(2);
  });

  it("durations=[2,3] → kubełek '2–3d' count=2", () => {
    const buckets = buildCycleBuckets([2, 3]);
    expect(buckets.find((b) => b.label === "2–3d")?.count).toBe(2);
  });

  it("durations=[8,15] → kubełek '8+d' count=2", () => {
    const buckets = buildCycleBuckets([8, 15]);
    expect(buckets.find((b) => b.label === "8+d")?.count).toBe(2);
  });
});

describe("Obliczanie mediany (computeMedian)", () => {
  it("nieparzysta [1,3,5] → mediana = 3", () => {
    expect(computeMedian([1, 3, 5])).toBe(3);
  });
});

describe("Obliczanie średniej (computeAverage)", () => {
  it("[2,4,6] → średnia = 4", () => {
    expect(computeAverage([2, 4, 6])).toBe(4);
  });
});
