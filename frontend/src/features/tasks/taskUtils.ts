import type { Task, TaskStatus } from "./types";

export function filterTasksByAssignee(tasks: Task[], userId: number): Task[] {
  return tasks.filter((t) =>
    (t.assignees ?? []).some((u) => u.id === userId)
  );
}

export function isStatusBackward(
  current: TaskStatus,
  next: TaskStatus
): boolean {
  const order: TaskStatus[] = ["todo", "doing", "done"];
  return order.indexOf(next) < order.indexOf(current);
}
