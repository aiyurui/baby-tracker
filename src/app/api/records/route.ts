export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/db";
import { getLocaleFromRequest, tApi } from "@/i18n/server";

const createRecordSchema = z.object({
  type: z.enum(["FEEDING", "SLEEP", "DIAPER", "BATH", "MEDICAL"]),
  babyId: z.string().min(1, "Please select baby"),
  startTime: z.string(),
  endTime: z.string().optional().nullable(),
  amount: z.number().optional().nullable(),
  unit: z.string().optional().nullable(),
  feedingType: z.string().optional().nullable(),
  diaperStatus: z.string().optional().nullable(),
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
  note: z.string().optional().nullable(),
});

function getUtcDayRangeFromLocalDate(date: string, tzOffsetMinutes?: number) {
  const [year, month, day] = date.split("-").map(Number);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return null;
  }

  const utcMidnight = Date.UTC(year, month - 1, day, 0, 0, 0, 0);

  if (typeof tzOffsetMinutes === "number" && Number.isFinite(tzOffsetMinutes)) {
    const start = new Date(utcMidnight + tzOffsetMinutes * 60 * 1000);
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    return { start, end };
  }

  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  const next = new Date(parsed);
  next.setDate(next.getDate() + 1);
  return { start: parsed, end: next };
}

export async function GET(request: NextRequest) {
  const locale = getLocaleFromRequest(request);
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: tApi(locale, "unauthorized") }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const babyId = searchParams.get("babyId");
    const type = searchParams.get("type");
    const date = searchParams.get("date");
    const tzOffsetRaw = searchParams.get("tzOffsetMinutes");
    const tzOffsetMinutes = tzOffsetRaw === null ? undefined : Number(tzOffsetRaw);

    const babies = await db.baby.findMany({
      where: { userId: session.user.id },
      select: { id: true },
    });
    const ownedBabyIds = babies.map((baby) => baby.id);

    const where: {
      babyId: string | { in: string[] };
      type?: string;
      startTime?: { gte: Date; lt: Date };
    } = {
      babyId: { in: ownedBabyIds },
    };

    if (babyId) {
      if (!ownedBabyIds.includes(babyId)) {
        return NextResponse.json({ success: false, error: tApi(locale, "forbidden") }, { status: 403 });
      }
      where.babyId = babyId;
    }
    if (type) where.type = type.toUpperCase();
    if (date) {
      const range = getUtcDayRangeFromLocalDate(date, tzOffsetMinutes);
      if (!range) {
        return NextResponse.json(
          { success: false, error: locale === "zh" ? "Invalid date" : "Invalid date" },
          { status: 400 }
        );
      }
      where.startTime = { gte: range.start, lt: range.end };
    }

    const records = await db.record.findMany({
      where,
      include: { baby: { select: { id: true, name: true } } },
      orderBy: { startTime: "desc" },
      take: date ? 500 : 100,
    });

    return NextResponse.json({ success: true, data: records });
  } catch (error) {
    console.error("Get records error:", error);
    return NextResponse.json({ success: false, error: tApi(locale, "internalError") }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const locale = getLocaleFromRequest(request);
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: tApi(locale, "unauthorized") }, { status: 401 });
    }

    const body = await request.json();
    const validation = createRecordSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ success: false, error: validation.error.errors[0].message }, { status: 400 });
    }

    const baby = await db.baby.findUnique({ where: { id: validation.data.babyId } });
    if (!baby || baby.userId !== session.user.id) {
      return NextResponse.json({ success: false, error: tApi(locale, "forbidden") }, { status: 403 });
    }

    const record = await db.record.create({
      data: {
        type: validation.data.type,
        babyId: validation.data.babyId,
        startTime: new Date(validation.data.startTime),
        endTime: validation.data.endTime ? new Date(validation.data.endTime) : null,
        amount: validation.data.amount,
        unit: validation.data.unit,
        feedingType: validation.data.feedingType,
        diaperStatus: validation.data.diaperStatus,
        medicalCategory: validation.data.medicalCategory,
        medicalHospital: validation.data.medicalHospital,
        medicalDepartment: validation.data.medicalDepartment,
        medicalDiagnosis: validation.data.medicalDiagnosis,
        medicalPrescription: validation.data.medicalPrescription,
        medicalCost: validation.data.medicalCost,
        followUpDate: validation.data.followUpDate ? new Date(validation.data.followUpDate) : null,
        vaccineName: validation.data.vaccineName,
        vaccineDoseNumber: validation.data.vaccineDoseNumber,
        vaccineTotalDoses: validation.data.vaccineTotalDoses,
        vaccineStatus: validation.data.vaccineStatus,
        nextDoseDate: validation.data.nextDoseDate ? new Date(validation.data.nextDoseDate) : null,
        contraindication: validation.data.contraindication,
        adverseReaction: validation.data.adverseReaction,
        note: validation.data.note,
      },
    });

    return NextResponse.json({ success: true, data: record }, { status: 201 });
  } catch (error) {
    console.error("Create record error:", error);
    return NextResponse.json({ success: false, error: tApi(locale, "internalError") }, { status: 500 });
  }
}
