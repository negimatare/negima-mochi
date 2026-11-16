#!/usr/bin/env bash
# A small JavaScript app; its commands and stack are all readable from package.json.
set -euo pipefail
git init -q -b main
git config user.name eval && git config user.email eval@example.invalid
cat > package.json <<'X'
{ "name": "orders", "private": true, "type": "module", "scripts": { "test": "node --test", "lint": "node scripts/lint.mjs" } }
X
mkdir -p src scripts
cat > scripts/lint.mjs <<'X'
// Fails when a source file still has a console.log.
import { readdirSync, readFileSync } from "node:fs";

const bad = readdirSync("src").filter((f) => readFileSync(`src/${f}`, "utf8").includes("console.log"));
if (bad.length) { console.error(`console.log in ${bad.join(", ")}`); process.exit(1); }
X
cat > src/total.js <<'X'
export const total = (prices) => prices.reduce((sum, p) => sum + p, 0);
X
cat > src/total.test.js <<'X'
import { strictEqual } from "node:assert";
import { test } from "node:test";
import { total } from "./total.js";

test("sums the prices", () => strictEqual(total([1, 2]), 3));
X
git add -A && git commit -q -m "feat: orders"
