export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { db } from "@/db";
import { getLocaleFromRequest, tApi } from "@/i18n/server";
import { updateBabySchema } from "@/validations/baby";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const locale = getLocaleFromRequest(request);
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: tApi(locale, "unauthorized") }, { status: 401 });
    }

    const baby = await db.baby.findUnique({ where: { id: params.id } });
    if (!baby || baby.userId !== session.user.id) {
      return NextResponse.json({ success: false, error: tApi(locale, "babyNotFound") }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: baby });
  } catch (error) {
    console.error("Get baby error:", error);
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

    const baby = await db.baby.findUnique({ where: { id: params.id } });
    if (!baby || baby.userId !== session.user.id) {
      return NextResponse.json({ success: false, error: tApi(locale, "babyNotFound") }, { status: 404 });
    }

    const contentType = request.headers.get("content-type") || "";
    if (!contentType.toLowerCase().includes("application/json")) {
      return NextResponse.json(
        { success: false, error: locale === "zh" ? "请求格式错误" : "Invalid request content type" },
        { status: 400 }
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: locale === "zh" ? "请求数据格式错误" : "Invalid request body" },
        { status: 400 }
      );
    }

    const validation = updateBabySchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ success: false, error: validation.error.errors[0].message }, { status: 400 });
    }

    if (validation.data.name && validation.data.name !== baby.name) {
      const duplicated = await db.baby.findFirst({
        where: {
          userId: session.user.id,
          name: validation.data.name,
          id: { not: params.id },
        },
        select: { id: true },
      });

      if (duplicated) {
        return NextResponse.json(
          {
            success: false,
            error: locale === "zh" ? "同一账户下不允许使用同名宝宝，请修改姓名" : "Baby name already exists in this account",
          },
          { status: 409 }
        );
      }
    }

    const updatedBaby = await db.baby.update({
      where: { id: params.id },
      data: {
        ...validation.data,
        birthDate: validation.data.birthDate ? new Date(validation.data.birthDate) : undefined,
      },
    });

    return NextResponse.json({ success: true, data: updatedBaby });
  } catch (error) {
    console.error("Update baby error:", error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return NextResponse.json(
        { success: false, error: locale === "zh" ? "数据库操作失败，请稍后重试" : "Database operation failed" },
        { status: 500 }
      );
    }

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

    const baby = await db.baby.findUnique({ where: { id: params.id } });
    if (!baby || baby.userId !== session.user.id) {
      return NextResponse.json({ success: false, error: tApi(locale, "babyNotFound") }, { status: 404 });
    }

    await db.baby.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete baby error:", error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return NextResponse.json(
        { success: false, error: locale === "zh" ? "数据库操作失败，请稍后重试" : "Database operation failed" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: false, error: tApi(locale, "internalError") }, { status: 500 });
  }
}
