import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

test("records api should support tzOffsetMinutes day-range filtering", () => {
  const source = readFileSync(resolve("src/app/api/records/route.ts"), "utf8");
  assert.match(source, /function getUtcDayRangeFromLocalDate\(date: string, tzOffsetMinutes\?: number\)/);
  assert.match(source, /const tzOffsetRaw = searchParams\.get\("tzOffsetMinutes"\);/);
  assert.match(source, /where\.startTime = \{ gte: range\.start, lt: range\.end \};/);
});

test("dashboard and refetch should pass tzOffsetMinutes when querying by date", () => {
  const dashboard = readFileSync(resolve("src/app/dashboard/dashboard-content.tsx"), "utf8");
  const refetch = readFileSync(resolve("src/lib/refetch-day-records.ts"), "utf8");
  assert.match(dashboard, /params\.set\("tzOffsetMinutes", String\(new Date\(\)\.getTimezoneOffset\(\)\)\);/);
  assert.match(refetch, /params\.set\("tzOffsetMinutes", String\(new Date\(\)\.getTimezoneOffset\(\)\)\);/);
});
