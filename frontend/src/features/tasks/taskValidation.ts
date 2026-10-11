import { z } from "zod";

export const titleField = z
  .string()
  .trim()
  .min(3, "Tytuł musi mieć min. 3 znaki");

export const estHoursField = z
  .string()
  .optional()
  .refine(
    (v) =>
      v === undefined ||
      v === "" ||
      (!Number.isNaN(parseFloat(v)) && parseFloat(v) >= 0),
    "Szacowany czas musi być ≥ 0",
  );

export const costAmountField = z
  .string()
  .optional()
  .refine(
    (v) =>
      v === undefined ||
      v === "" ||
      (!Number.isNaN(parseFloat(v)) && parseFloat(v) >= 0),
    "Koszt musi być ≥ 0",
  );

export const receiptUrlField = z
  .string()
  .optional()
  .refine(
    (v) => !v || v.trim() === "" || /^https?:\/\/.+/i.test(v),
    "Niepoprawny adres URL",
  );

export function validateDateRange(
  start_date?: string,
  due_date?: string,
): boolean {
  if (start_date && due_date && start_date > due_date) return false;
  return true;
}
