import type { QueryClient } from "@tanstack/react-query";
import type { Record } from "@/types";

type DashboardRecord = Record & { baby: { id: string; name: string } };

function toDateKey(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export async function refetchDayRecordsOnce(
  queryClient: QueryClient,
  startTime: string | Date,
  babyId?: string
) {
  const dateKey = toDateKey(startTime);
  const params = new URLSearchParams();
  params.set("date", dateKey);
  params.set("_ts", String(Date.now()));
  params.set("tzOffsetMinutes", String(new Date().getTimezoneOffset()));
  const url = `/api/records?${params.toString()}`;
  const response = await fetch(url, {
    cache: "no-store",
    credentials: "include",
  });
  if (!response.ok) return;
  const json = (await response.json()) as { data?: DashboardRecord[] };
  const records = json.data || [];

  queryClient.setQueryData<DashboardRecord[]>(["records-by-day", "ALL", dateKey], records);

  if (babyId) {
    queryClient.setQueryData<DashboardRecord[]>(
      ["records-by-day", babyId, dateKey],
      records.filter((record) => record.babyId === babyId)
    );
  }
}
