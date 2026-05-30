import test from "node:test";
import assert from "node:assert/strict";
import { isDuplicateBabyError, mapBabyRequestError } from "../src/lib/baby-request.ts";

test("create success should not be treated as duplicate", () => {
  assert.equal(isDuplicateBabyError(201, ""), false);
});

test("duplicate should be recognized by status code", () => {
  assert.equal(isDuplicateBabyError(409, ""), true);
});

test("duplicate should be recognized by message", () => {
  assert.equal(isDuplicateBabyError(400, "Baby name already exists in this account"), true);
});

test("duplicate mapping should produce duplicate title", () => {
  const zh = mapBabyRequestError("zh", 409, "", "新增宝宝失败");
  const en = mapBabyRequestError("en", 409, "", "Create baby failed");
  assert.equal(zh.title, "重名");
  assert.equal(en.title, "Duplicate name");
});

test("non-duplicate mapping should preserve fallback title and include status", () => {
  const result = mapBabyRequestError("zh", 500, "", "新增宝宝失败");
  assert.equal(result.title, "新增宝宝失败");
  assert.match(result.description, /状态码 500/);
});
