export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { getLocaleFromRequest, tApi } from "@/i18n/server";
import { isAdminLike, isSuperAdmin, ROLE } from "@/lib/roles";

type Params = { params: { id: string } };

export async function PATCH(request: NextRequest, { params }: Params) {
  const locale = getLocaleFromRequest(request);
  try {
    const session = await auth();
    if (!session?.user?.id || !isAdminLike(session.user.role)) {
      return NextResponse.json({ success: false, error: tApi(locale, "forbidden") }, { status: 403 });
    }
    if (!isSuperAdmin(session.user.role)) {
      return NextResponse.json({ success: false, error: tApi(locale, "forbidden") }, { status: 403 });
    }

    const targetId = params.id;
    const body = (await request.json()) as { role?: string };
    const nextRole = body?.role;
    if (nextRole !== ROLE.ADMIN && nextRole !== ROLE.USER) {
      return NextResponse.json({ success: false, error: "Invalid role" }, { status: 400 });
    }
    if (targetId === session.user.id) {
      return NextResponse.json({ success: false, error: "Cannot change your own role" }, { status: 400 });
    }

    const target = await db.user.findUnique({
      where: { id: targetId },
      select: { id: true, role: true },
    });
    if (!target) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }
    if (target.role === ROLE.SUPER_ADMIN) {
      return NextResponse.json({ success: false, error: "Super admin role is immutable" }, { status: 400 });
    }

    const user = await db.user.update({
      where: { id: targetId },
      data: { role: nextRole },
      select: { id: true, role: true },
    });

    return NextResponse.json({ success: true, data: user });
  } catch (error) {
    console.error("Patch admin user error:", error);
    return NextResponse.json({ success: false, error: tApi(locale, "internalError") }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const locale = getLocaleFromRequest(request);
  try {
    const session = await auth();
    if (!session?.user?.id || !isAdminLike(session.user.role)) {
      return NextResponse.json({ success: false, error: tApi(locale, "forbidden") }, { status: 403 });
    }

    const targetId = params.id;
    if (targetId === session.user.id) {
      return NextResponse.json({ success: false, error: "Cannot delete yourself" }, { status: 400 });
    }

    const target = await db.user.findUnique({
      where: { id: targetId },
      select: { id: true, role: true },
    });
    if (!target) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    if (target.role === ROLE.SUPER_ADMIN) {
      return NextResponse.json({ success: false, error: "Cannot delete super admin" }, { status: 400 });
    }
    if (target.role === ROLE.ADMIN && !isSuperAdmin(session.user.role)) {
      return NextResponse.json({ success: false, error: tApi(locale, "forbidden") }, { status: 403 });
    }

    await db.user.delete({ where: { id: targetId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete admin user error:", error);
    return NextResponse.json({ success: false, error: tApi(locale, "internalError") }, { status: 500 });
  }
}

