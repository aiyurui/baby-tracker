import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { VaccinesContent } from "./vaccines-content";

export default async function VaccinesPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const babies = await db.baby.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  const babyIds = babies.map((b) => b.id);

  const vaccineRecords = await db.record.findMany({
    where: {
      babyId: { in: babyIds },
      type: "MEDICAL",
      medicalCategory: "VACCINE",
    },
    include: { baby: { select: { id: true, name: true } } },
    orderBy: { startTime: "desc" },
    take: 200,
  });

  return <VaccinesContent babies={babies} vaccineRecords={vaccineRecords} />;
}
