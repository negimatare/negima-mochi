#!/usr/bin/env bash
# Branch receipts changes api/ and web/, each with one small file and one
# unused parameter, so that each area has a Minor finding.
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
cat > api/receipt.ts <<'Y'
/** The receipt total in cents, from item prices in cents. */
export const receiptTotal = (cents: number[], currency: string): number => cents.reduce((sum, c) => sum + c, 0);
Y
cat > api/receipt.test.ts <<'Y'
import { strictEqual } from "node:assert";
import { test } from "node:test";
import { receiptTotal } from "./receipt.ts";

test("sums the prices", () => strictEqual(receiptTotal([150, 200], "EUR"), 350));
Y
cat > web/receiptView.ts <<'Y'
/** A receipt line such as "Coffee  3.50", from a price in cents. */
export const receiptLine = (name: string, cents: number, locale: string): string => `${name}  ${(cents / 100).toFixed(2)}`;
Y
git add -A && git commit -q -m "feat: receipts"
mkdir -p .reviews && echo '.reviews/' >> .git/info/exclude
