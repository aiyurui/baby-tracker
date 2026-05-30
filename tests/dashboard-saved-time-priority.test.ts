import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

test("dashboard realtime should prioritize submitted startTime over server-created startTime", () => {
  const source = readFileSync(resolve("src/app/dashboard/dashboard-content.tsx"), "utf8");
  assert.match(source, /const effectiveStartTime = saved\?\.startTime \|\| created\?\.startTime;/);
  assert.match(source, /const effectiveBabyId = saved\?\.babyId \|\| created\?\.babyId;/);
});

test("dashboard realtime should use single refetch without invalidate for same query key", () => {
  const source = readFileSync(resolve("src/app/dashboard/dashboard-content.tsx"), "utf8");
  assert.match(source, /await queryClient\.refetchQueries\(\{ queryKey: key, exact: true, type: "active" \}\);/);
  assert.doesNotMatch(source, /await queryClient\.invalidateQueries\(\{ queryKey: key, exact: true \}\);/);
});
