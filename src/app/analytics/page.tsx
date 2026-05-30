import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { AnalyticsContent } from "./analytics-content";

async function getMonthData(babyIds: string[]) {
  const today = new Date();
  const monthAgo = new Date(today);
  monthAgo.setDate(today.getDate() - 29);
  monthAgo.setHours(0, 0, 0, 0);

  return db.record.findMany({
    where: {
      babyId: { in: babyIds },
      startTime: { gte: monthAgo },
    },
    orderBy: { startTime: "asc" },
  });
}

export default async function AnalyticsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const babies = await db.baby.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  const babyIds = babies.map((b) => b.id);
  const monthRecords = await getMonthData(babyIds);

  return <AnalyticsContent babies={babies} monthRecords={monthRecords} />;
}
