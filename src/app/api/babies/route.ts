export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { db } from "@/db";
import { getLocaleFromRequest, tApi } from "@/i18n/server";
import { babySchema } from "@/validations/baby";

export async function GET(request: NextRequest) {
  const locale = getLocaleFromRequest(request);
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: tApi(locale, "unauthorized") }, { status: 401 });
    }

    const babies = await db.baby.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: babies });
  } catch (error) {
    console.error("Get babies error:", error);
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

    const validation = babySchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ success: false, error: validation.error.errors[0].message }, { status: 400 });
    }

    const duplicated = await db.baby.findFirst({
      where: {
        userId: session.user.id,
        name: validation.data.name,
      },
      select: { id: true },
    });

    if (duplicated) {
      return NextResponse.json(
        {
          success: false,
          error: locale === "zh" ? "同一账户下不允许添加同名宝宝，请修改姓名" : "Baby name already exists in this account",
        },
        { status: 409 }
      );
    }

    const baby = await db.baby.create({
      data: {
        ...validation.data,
        birthDate: new Date(validation.data.birthDate),
        userId: session.user.id,
      },
    });

    return NextResponse.json({ success: true, data: baby, message: "Baby created successfully" }, { status: 201 });
  } catch (error) {
    console.error("Create baby error:", error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return NextResponse.json(
        { success: false, error: locale === "zh" ? "数据库操作失败，请稍后重试" : "Database operation failed" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: false, error: tApi(locale, "internalError") }, { status: 500 });
  }
}
