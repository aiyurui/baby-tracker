import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

test("height-weight dialog should use readable Chinese labels in payload", () => {
  const source = readFileSync(resolve("src/components/records/height-weight-dialog.tsx"), "utf8");

  assert.match(source, /身高:/);
  assert.match(source, /体重:/);
  assert.match(source, /备注:/);
  assert.match(source, /身高体重/);
  assert.match(source, /儿童保健/);
});
