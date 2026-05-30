export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { db } from "@/db";
import { getLocaleFromRequest, tApi } from "@/i18n/server";
import { ROLE } from "@/lib/roles";
import { normalizeUsername } from "@/lib/username";
import { registerSchema } from "@/validations/auth";

export async function POST(request: NextRequest) {
  const locale = getLocaleFromRequest(request);
  try {
    const body = await request.json();
    const validation = registerSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ success: false, error: validation.error.errors[0].message }, { status: 400 });
    }

    const { email, password, username } = validation.data;
    const existingUser = await db.user.findUnique({ where: { email } });
    const normalizedUsername = normalizeUsername(username);
    const exactUsername = await db.user.findFirst({
      where: { name: username },
      select: { id: true, name: true },
    });

    let existingUsername = !!exactUsername;
    if (!existingUsername) {
      const existingUsernameCandidates = await db.user.findMany({
        where: { name: { not: null } },
        select: { name: true },
      });
      existingUsername = existingUsernameCandidates.some(
        (u) => u.name && normalizeUsername(u.name) === normalizedUsername
      );
    }

    if (existingUser) {
      return NextResponse.json({ success: false, error: tApi(locale, "emailRegistered") }, { status: 400 });
    }
    if (existingUsername) {
      return NextResponse.json(
        {
          success: false,
          error: locale === "zh" ? "\u7528\u6237\u540d\u5df2\u88ab\u4f7f\u7528" : "Username already taken",
        },
        { status: 400 }
      );
    }

    const hashedPassword = await hash(password, 10);
    const user = await db.$transaction(async (tx) => {
      const usersCount = await tx.user.count();
      return tx.user.create({
        data: {
          email,
          password: hashedPassword,
          name: username,
          role: usersCount === 0 ? ROLE.SUPER_ADMIN : ROLE.USER,
        },
      });
    });

    return NextResponse.json(
      {
        success: true,
        data: { id: user.id, email: user.email, name: user.name },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json({ success: false, error: tApi(locale, "registrationFailed") }, { status: 500 });
  }
}
