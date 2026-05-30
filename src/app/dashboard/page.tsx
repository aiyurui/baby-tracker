import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { DashboardContent } from "./dashboard-content";

async function getBabies(userId: string) {
  return db.baby.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}

async function getTodayRecords(babyIds: string[]) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  return db.record.findMany({
    where: {
      babyId: { in: babyIds },
      startTime: { gte: today },
    },
    include: { baby: { select: { id: true, name: true } } },
    orderBy: { startTime: "desc" },
  });
}

export default async function DashboardPage() {
  const session = await auth();
  
  if (!session?.user?.id) {
    redirect("/login");
  }

  const babies = await getBabies(session.user.id);
  const babyIds = babies.map((b) => b.id);
  const todayRecords = await getTodayRecords(babyIds);

  return (
    <DashboardContent
      babies={babies}
      todayRecords={todayRecords}
    />
  );
}
