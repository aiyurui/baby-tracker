import { z } from "zod";

function normalizeBirthDateInput(input: string): string {
  const trimmed = input.trim();
  if (/^\d{8}$/.test(trimmed)) {
    return `${trimmed.slice(0, 4)}-${trimmed.slice(4, 6)}-${trimmed.slice(6, 8)}`;
  }

  const normalized = trimmed.replace(/[./\s]+/g, "-");
  const parts = normalized.split("-");
  if (parts.length !== 3) return normalized;

  const [yearRaw, monthRaw, dayRaw] = parts;
  if (!/^\d{4}$/.test(yearRaw) || !/^\d{1,2}$/.test(monthRaw) || !/^\d{1,2}$/.test(dayRaw)) {
    return normalized;
  }

  return `${yearRaw}-${monthRaw.padStart(2, "0")}-${dayRaw.padStart(2, "0")}`;
}

function isValidBirthDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const [yearStr, monthStr, dayStr] = value.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);

  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return false;
  if (year < 1900 || year > 9999) return false;
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;

  const parsed = new Date(year, month - 1, day);
  if (parsed.getFullYear() !== year || parsed.getMonth() !== month - 1 || parsed.getDate() !== day) {
    return false;
  }

  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return parsed <= todayStart;
}

export const babySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "\u8bf7\u8f93\u5165\u5b9d\u5b9d\u59d3\u540d")
    .max(50, "\u59d3\u540d\u6700\u591a 50 \u4e2a\u5b57\u7b26"),
  birthDate: z
    .string()
    .min(1, "\u8bf7\u8f93\u5165\u51fa\u751f\u65e5\u671f")
    .transform((value) => normalizeBirthDateInput(value))
    .refine((value) => isValidBirthDate(value), {
      message: "\u8bf7\u8f93\u5165\u6709\u6548\u7684\u51fa\u751f\u65e5\u671f\uff08\u683c\u5f0f\uff1aYYYY-MM-DD\uff09",
    }),
  gender: z
    .string()
    .optional()
    .nullable()
    .transform((v) => (v === "" ? null : v)),
  avatarUrl: z.string().url().optional().nullable(),
});

export const updateBabySchema = babySchema.partial();

export type BabyInput = z.infer<typeof babySchema>;
export type UpdateBabyInput = z.infer<typeof updateBabySchema>;
