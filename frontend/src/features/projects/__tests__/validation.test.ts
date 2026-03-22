/**
 * Unit tests for Zod validation schemas used in Project modals.
 */
import { describe, it, expect } from "vitest";
import { z } from "zod";

const ProjectCreateSchema = z
  .object({
    name: z.string().trim().min(3, "Nazwa musi mieć min. 3 znaki"),
    description: z.string().optional(),
    start_date: z.string().optional(),
    end_date: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.start_date && data.end_date && data.start_date > data.end_date) {
      ctx.addIssue({
        code: "custom",
        path: ["end_date"],
        message: "Data końcowa nie może być wcześniejsza niż start",
      });
    }
  });

const emptyToNull = (v?: string) => (!v || v.trim() === "" ? null : v);

describe("ProjectCreateSchema", () => {
  it("accepts name with exactly 3 characters", () => {
    const result = ProjectCreateSchema.safeParse({ name: "ABC" });
    expect(result.success).toBe(true);
  });

  it("rejects empty name", () => {
    const result = ProjectCreateSchema.safeParse({ name: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const nameErrors = result.error.issues.filter((i) => i.path.includes("name"));
      expect(nameErrors.length).toBeGreaterThan(0);
    }
  });

  it("rejects end_date before start_date", () => {
    const result = ProjectCreateSchema.safeParse({
      name: "Bad Dates",
      start_date: "2026-06-01",
      end_date: "2026-01-01",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const endErrors = result.error.issues.filter((i) =>
        i.path.includes("end_date")
      );
      expect(endErrors.length).toBeGreaterThan(0);
    }
  });
});

describe("emptyToNull helper", () => {
  it("returns null for empty string", () => {
    expect(emptyToNull("")).toBeNull();
  });

  it("returns null for whitespace-only string", () => {
    expect(emptyToNull("   ")).toBeNull();
  });
});
