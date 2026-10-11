import type { Task, TaskStatus } from "./types";

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function filterByStatus(tasks: Task[], status: TaskStatus): Task[] {
  return tasks.filter((t) => t.status === status);
}

export function filterByPriority(tasks: Task[], priorities: number[]): Task[] {
  return tasks.filter((t) => priorities.includes(t.priority));
}

export function filterNoDueDate(tasks: Task[]): Task[] {
  return tasks.filter((t) => !t.due_date);
}

/** Overdue = nie done + start_date < today */
export function filterOverdue(tasks: Task[], today: Date): Task[] {
  const todayStart = startOfDay(today);
  return tasks.filter((t) => {
    if (t.status === "done") return false;
    const start = parseDate(t.start_date);
    return start != null && startOfDay(start).getTime() < todayStart.getTime();
  });
}

export function filterDueToday(tasks: Task[], today: Date): Task[] {
  const todayStart = startOfDay(today);
  return tasks.filter((t) => {
    const due = parseDate(t.due_date);
    if (!due) return false;
    return startOfDay(due).getTime() === todayStart.getTime();
  });
}

export function filterDueThisWeek(tasks: Task[], today: Date): Task[] {
  const todayStart = startOfDay(today);
  const currentDay = todayStart.getDay();
  const diffToMonday = (currentDay + 6) % 7;

  const weekStart = new Date(todayStart);
  weekStart.setDate(todayStart.getDate() - diffToMonday);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);

  return tasks.filter((t) => {
    const due = parseDate(t.due_date);
    if (!due) return false;
    const dueStart = startOfDay(due);
    return dueStart >= weekStart && dueStart < weekEnd;
  });
}
