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

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalUsers, totalBabies, totalRecords, todayRecords] = await Promise.all([
      db.user.count(),
      db.baby.count(),
      db.record.count(),
      db.record.count({
        where: {
          startTime: { gte: today },
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        totalUsers,
        totalBabies,
        totalRecords,
        todayRecords,
      },
    });
  } catch (error) {
    console.error("Get stats error:", error);
    return NextResponse.json({ success: false, error: tApi(locale, "internalError") }, { status: 500 });
  }
}
