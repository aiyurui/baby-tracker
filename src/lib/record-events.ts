import type { Record } from "@/types";

export const RECORD_CREATED_EVENT = "baby-tracker:record-created";

export function emitRecordCreated(record: Record) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<Record>(RECORD_CREATED_EVENT, { detail: record }));
}

