#!/usr/bin/env bash
# Branch receipts changes api/ and web/; .reviews/REV-20261102-receipts.md says api/ is done and web/ is next.
set -euo pipefail
git init -q -b main
git config user.name eval && git config user.email eval@example.invalid
mkdir -p api web
printf '# Shop\n\nA TypeScript server in api/ and a browser client in web/. No build step.\n' > CLAUDE.md
echo 'export const health = () => "ok";' > api/health.ts
git add -A && git commit -q -m "chore: init"
git remote add origin https://example.invalid/shop.git
git update-ref refs/remotes/origin/main main
git symbolic-ref refs/remotes/origin/HEAD refs/remotes/origin/main
git switch -q --no-track -c receipts
cat > api/receipt.ts <<'X'
/** The receipt total in cents, from item prices in cents. */
export const receiptTotal = (cents: number[]): number => cents.reduce((sum, c) => sum + c, 0);
X
cat > api/receipt.test.ts <<'X'
import { strictEqual } from "node:assert";
import { test } from "node:test";
import { receiptTotal } from "./receipt.ts";

test("an empty receipt totals zero", () => strictEqual(receiptTotal([]), 0));
X
cat > web/receiptView.ts <<'X'
/** A receipt line such as "Coffee  3.50", from a price in cents. */
export const receiptLine = (name: string, cents: number): string => `${name}  ${cents / 100}`;
X
git add -A && git commit -q -m "feat: receipts"
mkdir -p .reviews && echo '.reviews/' >> .git/info/exclude
cat > .reviews/REV-20261102-receipts.md <<'X'
# Review: receipts
Base: main · Areas: TypeScript api/ ✅, TypeScript web/ ▶
Open: 🔴 0 · 🟠 0 · 🟡 0 · 🔵 0

## TypeScript — api/
- [x] A-1 🟡 Medium  api/receipt.ts:2 — No test for an empty receipt. Fix: add one.
X
