export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/db";
import { getLocaleFromRequest, tApi } from "@/i18n/server";

const patchRecordSchema = z
  .object({
    startTime: z.string().optional(),
    endTime: z.string().nullable().optional(),
    amount: z.number().nullable().optional(),
    unit: z.string().nullable().optional(),
    feedingType: z.string().nullable().optional(),
    diaperStatus: z.string().nullable().optional(),
    medicalCategory: z.enum(["MEDICAL_VISIT", "HEIGHT_WEIGHT", "VACCINE"]).nullable().optional(),
    medicalHospital: z.string().nullable().optional(),
    medicalDepartment: z.string().nullable().optional(),
    medicalDiagnosis: z.string().nullable().optional(),
    medicalPrescription: z.string().nullable().optional(),
    medicalCost: z.number().nullable().optional(),
    followUpDate: z.string().nullable().optional(),
    vaccineName: z.string().nullable().optional(),
    vaccineDoseNumber: z.number().int().nullable().optional(),
    vaccineTotalDoses: z.number().int().nullable().optional(),
    vaccineStatus: z.enum(["PLANNED", "COMPLETED", "DEFERRED"]).nullable().optional(),
    nextDoseDate: z.string().nullable().optional(),
    contraindication: z.string().nullable().optional(),
    adverseReaction: z.string().nullable().optional(),
    note: z.string().nullable().optional(),
  })
  .strict();

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const locale = getLocaleFromRequest(request);
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: tApi(locale, "unauthorized") }, { status: 401 });
    }

    const record = await db.record.findUnique({
      where: { id: params.id },
      include: { baby: true },
    });

    if (!record) {
      return NextResponse.json({ success: false, error: tApi(locale, "recordNotFound") }, { status: 404 });
    }
    if (record.baby.userId !== session.user.id) {
      return NextResponse.json({ success: false, error: tApi(locale, "forbidden") }, { status: 403 });
    }

    return NextResponse.json({ success: true, data: record });
  } catch (error) {
    console.error("Get record error:", error);
    return NextResponse.json({ success: false, error: tApi(locale, "internalError") }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const locale = getLocaleFromRequest(request);
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: tApi(locale, "unauthorized") }, { status: 401 });
    }

    const record = await db.record.findUnique({
      where: { id: params.id },
      include: { baby: true },
    });

    if (!record) {
      return NextResponse.json({ success: false, error: tApi(locale, "recordNotFound") }, { status: 404 });
    }
    if (record.baby.userId !== session.user.id) {
      return NextResponse.json({ success: false, error: tApi(locale, "forbidden") }, { status: 403 });
    }

    await db.record.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete record error:", error);
    return NextResponse.json({ success: false, error: tApi(locale, "internalError") }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const locale = getLocaleFromRequest(request);
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: tApi(locale, "unauthorized") }, { status: 401 });
    }

    const record = await db.record.findUnique({
      where: { id: params.id },
      include: { baby: true },
    });

    if (!record) {
      return NextResponse.json({ success: false, error: tApi(locale, "recordNotFound") }, { status: 404 });
    }
    if (record.baby.userId !== session.user.id) {
      return NextResponse.json({ success: false, error: tApi(locale, "forbidden") }, { status: 403 });
    }

    const body = await request.json();
    const validation = patchRecordSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ success: false, error: validation.error.errors[0]?.message || tApi(locale, "internalError") }, { status: 400 });
    }

    const data = validation.data;
    const updated = await db.record.update({
      where: { id: params.id },
      data: {
        startTime: data.startTime ? new Date(data.startTime) : undefined,
        endTime: data.endTime !== undefined ? (data.endTime ? new Date(data.endTime) : null) : undefined,
        amount: data.amount,
        unit: data.unit,
        feedingType: data.feedingType,
        diaperStatus: data.diaperStatus,
        medicalCategory: data.medicalCategory,
        medicalHospital: data.medicalHospital,
        medicalDepartment: data.medicalDepartment,
        medicalDiagnosis: data.medicalDiagnosis,
        medicalPrescription: data.medicalPrescription,
        medicalCost: data.medicalCost,
        followUpDate: data.followUpDate !== undefined ? (data.followUpDate ? new Date(data.followUpDate) : null) : undefined,
        vaccineName: data.vaccineName,
        vaccineDoseNumber: data.vaccineDoseNumber,
        vaccineTotalDoses: data.vaccineTotalDoses,
        vaccineStatus: data.vaccineStatus,
        nextDoseDate: data.nextDoseDate !== undefined ? (data.nextDoseDate ? new Date(data.nextDoseDate) : null) : undefined,
        contraindication: data.contraindication,
        adverseReaction: data.adverseReaction,
        note: data.note,
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("Patch record error:", error);
    return NextResponse.json({ success: false, error: tApi(locale, "internalError") }, { status: 500 });
  }
}
