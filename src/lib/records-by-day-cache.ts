import type { QueryClient } from "@tanstack/react-query";
import type { Baby, Record } from "@/types";

type DashboardRecord = Record & { baby: { id: string; name: string } };

function toLocalDateKey(value: string | Date | null | undefined) {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  const y = parsed.getFullYear();
  const m = String(parsed.getMonth() + 1).padStart(2, "0");
  const d = String(parsed.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function toDashboardRecord(record: Record, babies: Baby[]): DashboardRecord {
  const babyName = babies.find((baby) => baby.id === record.babyId)?.name || "";
  return {
    ...record,
    baby: { id: record.babyId, name: babyName },
  } as DashboardRecord;
}

export function insertCreatedRecordIntoRecordsByDayCache(
  queryClient: QueryClient,
  createdRecord: Record,
  babies: Baby[]
) {
  const createdDayKey = toLocalDateKey(createdRecord.startTime);
  if (!createdDayKey) return;

  const optimistic = toDashboardRecord(createdRecord, babies);
  const queries = queryClient.getQueriesData<DashboardRecord[]>({
    queryKey: ["records-by-day"],
  });

  for (const [key] of queries) {
    if (!Array.isArray(key)) continue;
    const babyScope = key[1];
    const dateScope = key[2];

    if (typeof dateScope !== "string" || dateScope !== createdDayKey) continue;
    if (
      typeof babyScope === "string" &&
      babyScope !== "ALL" &&
      babyScope !== createdRecord.babyId
    ) {
      continue;
    }

    queryClient.setQueryData<DashboardRecord[]>(key, (prev = []) => {
      if (prev.some((item) => item.id === optimistic.id)) return prev;
      return [optimistic, ...prev].sort(
        (a, b) =>
          new Date(b.startTime as unknown as string).getTime() -
          new Date(a.startTime as unknown as string).getTime()
      );
    });
  }
}

export function forceInsertRecordIntoAllRecordsByDayCaches(
  queryClient: QueryClient,
  createdRecord: Record,
  babies: Baby[]
) {
  const optimistic = toDashboardRecord(createdRecord, babies);
  const queries = queryClient.getQueriesData<DashboardRecord[]>({
    queryKey: ["records-by-day"],
  });

  for (const [key] of queries) {
    if (!Array.isArray(key)) continue;
    const babyScope = key[1];
    if (
      typeof babyScope === "string" &&
      babyScope !== "ALL" &&
      babyScope !== createdRecord.babyId
    ) {
      continue;
    }

    queryClient.setQueryData<DashboardRecord[]>(key, (prev = []) => {
      if (prev.some((item) => item.id === optimistic.id)) return prev;
      return [optimistic, ...prev].sort(
        (a, b) =>
          new Date(b.startTime as unknown as string).getTime() -
          new Date(a.startTime as unknown as string).getTime()
      );
    });
  }
}
