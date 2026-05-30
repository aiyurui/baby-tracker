import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { isAdminLike } from "@/lib/roles";
import { AdminContent } from "./admin-content";

function getLast7Days() {
  const days: Date[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    days.push(d);
  }
  return days;
}

function dayKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function dayLabel(date: Date) {
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function getLast30Start() {
  const d = new Date();
  d.setDate(d.getDate() - 29);
  d.setHours(0, 0, 0, 0);
  return d;
}

export default async function AdminPage() {
  const session = await auth();

  if (!session?.user?.id || !isAdminLike(session.user.role)) {
    redirect("/dashboard");
  }

  const days = getLast7Days();
  const weekStart = days[0];
  const monthStart = getLast30Start();

  const [totalUsers, totalBabies, totalRecords, todayRecords, users, weekUsers, weekRecords, typeCounts, monthActiveRecords] =
    await Promise.all([
      db.user.count(),
      db.baby.count(),
      db.record.count(),
      db.record.count({
        where: {
          startTime: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
      }),
      db.user.findMany({
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
          _count: { select: { babies: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      db.user.findMany({
        where: { createdAt: { gte: weekStart } },
        select: { createdAt: true },
      }),
      db.record.findMany({
        where: { startTime: { gte: weekStart } },
        select: { startTime: true, type: true },
      }),
      db.record.groupBy({
        by: ["type"],
        _count: { type: true },
      }),
      db.record.findMany({
        where: { startTime: { gte: monthStart } },
        select: {
          id: true,
          babyId: true,
          baby: {
            select: {
              id: true,
              name: true,
              userId: true,
              user: { select: { email: true, name: true } },
            },
          },
        },
      }),
    ]);

  const userByDay = new Map<string, number>();
  for (const entry of weekUsers) {
    const key = dayKey(entry.createdAt);
    userByDay.set(key, (userByDay.get(key) ?? 0) + 1);
  }

  const recordByDay = new Map<string, number>();
  for (const entry of weekRecords) {
    const key = dayKey(entry.startTime);
    recordByDay.set(key, (recordByDay.get(key) ?? 0) + 1);
  }

  const userGrowth = days.map((day) => {
    const key = dayKey(day);
    return { date: dayLabel(day), count: userByDay.get(key) ?? 0 };
  });

  const recordGrowth = days.map((day) => {
    const key = dayKey(day);
    return { date: dayLabel(day), count: recordByDay.get(key) ?? 0 };
  });

  const recordTypeStats = typeCounts.map((item) => ({
    type: item.type,
    value: item._count.type,
  }));

  const userMap = new Map<string, { userId: string; email: string; name: string; recordCount: number }>();
  const babyMap = new Map<string, { babyId: string; name: string; userName: string; recordCount: number }>();

  for (const record of monthActiveRecords) {
    const userId = record.baby.userId;
    const userName = record.baby.user.name || record.baby.user.email;
    const userPrev = userMap.get(userId);
    userMap.set(userId, {
      userId,
      email: record.baby.user.email,
      name: userName,
      recordCount: (userPrev?.recordCount ?? 0) + 1,
    });

    const babyPrev = babyMap.get(record.baby.id);
    babyMap.set(record.baby.id, {
      babyId: record.baby.id,
      name: record.baby.name,
      userName,
      recordCount: (babyPrev?.recordCount ?? 0) + 1,
    });
  }

  const topUsers = Array.from(userMap.values())
    .sort((a, b) => b.recordCount - a.recordCount)
    .slice(0, 10)
    .map((item) => ({
      ...item,
      activityPerDay: Number((item.recordCount / 30).toFixed(1)),
    }));

  const topBabies = Array.from(babyMap.values())
    .sort((a, b) => b.recordCount - a.recordCount)
    .slice(0, 10)
    .map((item) => ({
      ...item,
      activityPerDay: Number((item.recordCount / 30).toFixed(1)),
    }));

  return (
    <AdminContent
      currentUser={{ id: session.user.id, role: session.user.role }}
      stats={{ totalUsers, totalBabies, totalRecords, todayRecords }}
      userGrowth={userGrowth}
      recordGrowth={recordGrowth}
      recordTypeStats={recordTypeStats}
      topUsers={topUsers}
      topBabies={topBabies}
      users={users.map((u) => ({
        ...u,
        babiesCount: u._count.babies,
      }))}
    />
  );
}
