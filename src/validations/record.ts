import { z } from "zod";

const baseRecordSchema = z.object({
  type: z.enum(["FEEDING", "SLEEP", "DIAPER", "BATH", "MEDICAL"]),
  babyId: z.string().min(1, "请选择宝宝"),
  startTime: z.string(),
  endTime: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
});

export const feedingRecordSchema = baseRecordSchema.extend({
  type: z.literal("FEEDING"),
  amount: z.number().optional().nullable(),
  unit: z.string().optional().nullable(),
  feedingType: z.string().optional().nullable(),
});

export const sleepRecordSchema = baseRecordSchema.extend({
  type: z.literal("SLEEP"),
});

export const diaperRecordSchema = baseRecordSchema.extend({
  type: z.literal("DIAPER"),
  diaperStatus: z.string().optional().nullable(),
});

export const bathRecordSchema = baseRecordSchema.extend({
  type: z.literal("BATH"),
});

export const medicalRecordSchema = baseRecordSchema.extend({
  type: z.literal("MEDICAL"),
  medicalCategory: z.enum(["MEDICAL_VISIT", "HEIGHT_WEIGHT", "VACCINE"]).optional().nullable(),
  medicalHospital: z.string().optional().nullable(),
  medicalDepartment: z.string().optional().nullable(),
  medicalDiagnosis: z.string().optional().nullable(),
  medicalPrescription: z.string().optional().nullable(),
  medicalCost: z.number().optional().nullable(),
  followUpDate: z.string().optional().nullable(),
  vaccineName: z.string().optional().nullable(),
  vaccineDoseNumber: z.number().int().optional().nullable(),
  vaccineTotalDoses: z.number().int().optional().nullable(),
  vaccineStatus: z.enum(["PLANNED", "COMPLETED", "DEFERRED"]).optional().nullable(),
  nextDoseDate: z.string().optional().nullable(),
  contraindication: z.string().optional().nullable(),
  adverseReaction: z.string().optional().nullable(),
});

export const createRecordSchema = z.discriminatedUnion("type", [
  feedingRecordSchema,
  sleepRecordSchema,
  diaperRecordSchema,
  bathRecordSchema,
  medicalRecordSchema,
]);

export type FeedingRecordInput = z.infer<typeof feedingRecordSchema>;
export type SleepRecordInput = z.infer<typeof sleepRecordSchema>;
export type DiaperRecordInput = z.infer<typeof diaperRecordSchema>;
export type BathRecordInput = z.infer<typeof bathRecordSchema>;
export type MedicalRecordInput = z.infer<typeof medicalRecordSchema>;
export type CreateRecordInput = z.infer<typeof createRecordSchema>;
