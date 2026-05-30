import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { RecordsContent } from "./records-content";

interface RecordsPageProps {
  searchParams?: {
    type?: string;
    medicalCategory?: string;
    group?: string;
  };
}

export default async function RecordsPage({ searchParams }: RecordsPageProps) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const babies = await db.baby.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  const babyIds = babies.map((b) => b.id);
  const type = searchParams?.type?.toUpperCase();
  const medicalCategory = searchParams?.medicalCategory?.toUpperCase();
  const group = searchParams?.group?.toLowerCase();

  const records = await db.record.findMany({
    where: {
      babyId: { in: babyIds },
      ...(type ? { type } : {}),
      ...(medicalCategory ? { medicalCategory } : {}),
      ...(group === "feeding"
        ? {
            type: {
              in: ["FEEDING", "SLEEP", "DIAPER", "BATH"],
            },
          }
        : {}),
    },
    include: { baby: { select: { id: true, name: true } } },
    orderBy: { startTime: "desc" },
    take: 100,
  });

  return (
    <RecordsContent
      babies={babies}
      initialRecords={records}
      initialFilterType={group === "feeding" ? "FEEDING_GROUP" : type || "ALL"}
      initialMedicalCategory={medicalCategory || "ALL"}
    />
  );
}
