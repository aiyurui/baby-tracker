import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { BabiesContent } from "./babies-content";

export default async function BabiesPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const babies = await db.baby.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return <BabiesContent initialBabies={babies} />;
}

