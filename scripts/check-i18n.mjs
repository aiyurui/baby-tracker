import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadMessages() {
  const file = resolve(process.cwd(), "src/i18n/messages.ts");
  const source = readFileSync(file, "utf8");
  const startToken = "export const messages =";
  const endToken = "} as const;";
  const start = source.indexOf(startToken);
  const end = source.indexOf(endToken, start);
  if (start === -1 || end === -1) {
    throw new Error("Unable to parse src/i18n/messages.ts");
  }
  const objectLiteral = source.slice(start + startToken.length, end + 1).trim();
  return Function(`"use strict"; return (${objectLiteral});`)();
}

function collectPaths(value, prefix = "") {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => collectPaths(item, `${prefix}[${index}]`));
  }
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([key, nested]) =>
      collectPaths(nested, prefix ? `${prefix}.${key}` : key)
    );
  }
  return [prefix];
}

function normalizePath(path) {
  return path.replace(/\[\d+\]/g, "[]");
}

const messages = loadMessages();
const zhPaths = new Set(collectPaths(messages.zh).map(normalizePath));
const enPaths = new Set(collectPaths(messages.en).map(normalizePath));

const missingInEn = [...zhPaths].filter((path) => !enPaths.has(path));
const missingInZh = [...enPaths].filter((path) => !zhPaths.has(path));

if (missingInEn.length || missingInZh.length) {
  if (missingInEn.length) {
    console.error("Missing in en:");
    missingInEn.forEach((path) => console.error(`  - ${path}`));
  }
  if (missingInZh.length) {
    console.error("Missing in zh:");
    missingInZh.forEach((path) => console.error(`  - ${path}`));
  }
  process.exit(1);
}

console.log("i18n dictionary keys are in sync.");
