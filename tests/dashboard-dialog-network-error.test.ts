import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

test("feeding dialog should show destructive error toast on request network failure", () => {
  const source = readFileSync(resolve("src/components/records/feeding-dialog.tsx"), "utf8");
  assert.match(source, /\} catch \(error\) \{[\s\S]*?title: m\\.babies\\.addFailed,[\s\S]*?variant: "destructive",[\s\S]*?return;/);
});

test("medical visit dialog should show destructive error toast on request network failure", () => {
  const source = readFileSync(resolve("src/components/records/medical-visit-dialog.tsx"), "utf8");
  assert.match(source, /\} catch \{\s*toast\(\{ title: m\.common\.internalError, variant: "destructive" \}\);\s*return;\s*\}/);
});
