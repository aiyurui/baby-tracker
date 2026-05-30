import test from "node:test";
import assert from "node:assert/strict";
import { getLocalDateKeyFromDateTime, resolveRealtimeUpdateContext } from "../src/lib/dashboard-realtime.ts";

test("getLocalDateKeyFromDateTime should return null for invalid or empty input", () => {
  assert.equal(getLocalDateKeyFromDateTime(undefined), null);
  assert.equal(getLocalDateKeyFromDateTime(""), null);
  assert.equal(getLocalDateKeyFromDateTime("not-a-date"), null);
});

test("resolveRealtimeUpdateContext should fallback to active date when saved time missing", () => {
  const result = resolveRealtimeUpdateContext("2026-05-17", undefined);
  assert.equal(result.targetDateKey, "2026-05-17");
  assert.equal(result.shouldOptimisticInsert, true);
});

test("resolveRealtimeUpdateContext should allow optimistic insert on same day", () => {
  const result = resolveRealtimeUpdateContext("2026-05-17", "2026-05-17T09:30:00");
  assert.equal(result.targetDateKey, "2026-05-17");
  assert.equal(result.shouldOptimisticInsert, true);
});

test("resolveRealtimeUpdateContext should avoid optimistic insert on different day", () => {
  const result = resolveRealtimeUpdateContext("2026-05-17", "2026-05-16T23:30:00");
  assert.equal(result.targetDateKey, "2026-05-16");
  assert.equal(result.shouldOptimisticInsert, false);
});
