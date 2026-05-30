export const dynamic = "force-dynamic";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/auth";

export async function GET() {
  const session = await getServerSession(authOptions);
  return NextResponse.json({
    user: session?.user || null,
  });
};
