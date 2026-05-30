export function getLocalDateKeyFromDateTime(value?: string | Date) {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  const y = parsed.getFullYear();
  const m = String(parsed.getMonth() + 1).padStart(2, "0");
  const d = String(parsed.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function resolveRealtimeUpdateContext(
  activeDate: string,
  effectiveStartTime?: string | Date
) {
  const savedDateKey = getLocalDateKeyFromDateTime(effectiveStartTime);
  const targetDateKey = savedDateKey || activeDate;
  const shouldOptimisticInsert = targetDateKey === activeDate;
  return { targetDateKey, shouldOptimisticInsert };
}
