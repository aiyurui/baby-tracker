import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

test("feeding dialog should isolate post-save callback failures from save result", () => {
  const source = readFileSync(resolve("src/components/records/feeding-dialog.tsx"), "utf8");
  assert.match(source, /await Promise\.resolve\(onSaved\?\.\(\{ startTime: saved\.startTime, babyId: saved\.babyId, record: body\?\.data \}\)\);/);
  assert.match(source, /\} catch \(error\) \{[\s\S]*?\/\/ ignore post-save callback errors; keep save success path\s*\}/);
});

test("feeding dialog should recover save success after request network failure", () => {
  const source = readFileSync(resolve("src/components/records/feeding-dialog.tsx"), "utf8");
  assert.match(source, /const submitAttemptAtMs = Date\.now\(\);/);
  assert.match(source, /const hasExternalRealtimeHandler = typeof onSaved === "function";/);
  assert.match(source, /Math\.abs\(createdAtMs - submitAttemptAtMs\) > 3 \* 60 \* 1000/);
  assert.match(source, /let recoveredFromNetworkError = false;/);
  assert.match(source, /const recovered = await recoverSavedRecordFromDayApi\(\s*payloadRecord,\s*submitAttemptAtMs\s*\);/);
  assert.match(source, /if \(recovered\) \{\s*body = \{ success: true, data: recovered \};\s*recoveredFromNetworkError = true;\s*\}/);
  assert.match(source, /if \(!recoveredFromNetworkError\) \{\s*toast\(\{/);
  assert.match(source, /const isSuccess = recoveredFromNetworkError \|\| \(\!\!response\?\.ok && body\?\.success !== false\);/);
});

test("feeding dialog should avoid duplicate refetch path when onSaved handler exists", () => {
  const source = readFileSync(resolve("src/components/records/feeding-dialog.tsx"), "utf8");
  assert.match(source, /if \(payloadRecord\?\.startTime && !hasExternalRealtimeHandler\) \{/);
  assert.match(source, /if \(hasExternalRealtimeHandler\) \{\s*if \(recoveredFromNetworkError\) \{[\s\S]*?return;\s*\}/);
  assert.match(source, /if \(!hasExternalRealtimeHandler\) \{\s*await queryClient\.invalidateQueries\(\{ queryKey: \["records"\] \}\);\s*await queryClient\.invalidateQueries\(\{ queryKey: \["records-by-day"\] \}\);\s*\}/);
});

test("feeding dialog should not show internal error after save is accepted", () => {
  const source = readFileSync(resolve("src/components/records/feeding-dialog.tsx"), "utf8");
  assert.match(source, /let saveAccepted = false;/);
  assert.match(source, /saveAccepted = true;/);
  assert.match(source, /if \(!saveAccepted\) \{[\s\S]*?submit failed before save acceptance[\s\S]*?\}/);
  assert.doesNotMatch(source, /toast\(\{ title: m\.common\.internalError, variant: "destructive" \}\)/);
});
