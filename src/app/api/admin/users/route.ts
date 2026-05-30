export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { getLocaleFromRequest, tApi } from "@/i18n/server";
import { isAdminLike } from "@/lib/roles";

export async function GET(request: NextRequest) {
  const locale = getLocaleFromRequest(request);
  try {
    const session = await auth();
    if (!session?.user?.id || !isAdminLike(session.user.role)) {
      return NextResponse.json({ success: false, error: tApi(locale, "forbidden") }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const requestedPage = parseInt(searchParams.get("page") || "1", 10);
    const requestedPageSize = parseInt(searchParams.get("pageSize") || "20", 10);
    const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;
    const pageSize =
      Number.isFinite(requestedPageSize) && requestedPageSize > 0 ? Math.min(requestedPageSize, 100) : 20;
    const q = (searchParams.get("q") || "").trim();
    const role = (searchParams.get("role") || "").trim();
    const where = {
      ...(role && role !== "ALL" ? { role } : {}),
      ...(q
        ? {
            OR: [
              { email: { contains: q } },
              { name: { contains: q } },
            ],
          }
        : {}),
    };

    const [users, total] = await Promise.all([
      db.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
          _count: { select: { babies: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.user.count({ where }),
    ]);

    const data = users.map((user) => ({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt,
      babiesCount: user._count.babies,
    }));

    return NextResponse.json({
      success: true,
      data,
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error("Get users error:", error);
    return NextResponse.json({ success: false, error: tApi(locale, "internalError") }, { status: 500 });
  }
}
