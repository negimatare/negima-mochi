#!/usr/bin/env bash
# Two existing library patches each link their upstream issue. The
# slugify-patch branch adds a third whose removal note links nothing.
set -euo pipefail
git init -q -b main
git config user.name eval && git config user.email eval@example.invalid
mkdir -p src/patches
cat > CLAUDE.md <<'P'
# Shop

A TypeScript web shop. No build step; tests run with `node --test`.
P
cat > src/patches/money-format.patch.ts <<'P'
import { format } from "money-format";

// money-format 3.0 drops the minus sign on negative amounts (money-format#88).
// Remove once that issue is closed.
export const formatMoney = (cents: number): string =>
    cents < 0 ? `-${format(-cents)}` : format(cents);
P
cat > src/patches/csv-parse.patch.ts <<'P'
import { parse } from "csv-parse";

// csv-parse 5.4 keeps the BOM in the first header (csv-parse#412).
// Remove once that issue is closed.
export const parseCsv = (text: string): string[][] => parse(text.replace(/^﻿/, ""));
P
git add -A && git commit -q -m "chore: init"
git remote add origin https://example.invalid/shop.git
git update-ref refs/remotes/origin/main main
git symbolic-ref refs/remotes/origin/HEAD refs/remotes/origin/main
git switch -q -c slugify-patch
cat > src/patches/slugify.patch.ts <<'P'
import slugify from "slugify";

// slugify 2.0 keeps a trailing dash when the title ends in punctuation.
// Remove this patch when slugify ships a fix.
export const toSlug = (title: string): string => slugify(title).replace(/-+$/, "");
P
cat > src/patches/slugify.patch.test.ts <<'P'
import { strictEqual } from "node:assert";
import { test } from "node:test";
import { toSlug } from "./slugify.patch.ts";

test("drops the trailing dash", () => {
    strictEqual(toSlug("Hello, world!"), "hello-world");
});
P
git add -A && git commit -q -m "fix: drop slugify's trailing dash"
