import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

test("height-weight dialog should treat request network failure as error", () => {
  const source = readFileSync(resolve("src/components/records/height-weight-dialog.tsx"), "utf8");

  assert.match(
    source,
    /response = await fetch\("\/api\/records"[\s\S]*?\} catch \{\s*toast\(\{ title: m\.common\.internalError, variant: "destructive" \}\);\s*return;\s*\}/
  );
});
