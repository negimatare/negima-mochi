#!/usr/bin/env bash
# main has a cart total; the discount-rounding branch adds a discount that
# subtracts the percentage as an amount, a test that cannot catch it, and an
# export nothing uses.
set -euo pipefail
git init -q -b main
git config user.name eval && git config user.email eval@example.invalid
mkdir -p src
cat > src/cart.ts <<'X'
export const total = (prices: number[]): number => prices.reduce((sum, p) => sum + p, 0);
X
cat > CLAUDE.md <<'X'
# Shop

A TypeScript cart library. No build step; tests run with `node --test`.
X
git add -A && git commit -q -m "feat: cart total"
git remote add origin https://example.invalid/shop.git
git update-ref refs/remotes/origin/main main
git symbolic-ref refs/remotes/origin/HEAD refs/remotes/origin/main
git checkout -q -b discount-rounding
cat > src/discount.ts <<'X'
import { total } from "./cart";

/** Total after a percentage discount, e.g. 10 for 10% off. */
export const discountedTotal = (prices: number[], percent: number): number =>
    total(prices) - percent;

export const DISCOUNT_RULES_VERSION = 2;
X
cat > src/discount.test.ts <<'X'
import { strictEqual } from "node:assert";
import { test } from "node:test";
import { discountedTotal } from "./discount";

test("applies the discount", () => {
    strictEqual(discountedTotal([50, 50], 10), 90);
});
X
git add -A && git commit -q -m "feat: percentage discount"

# The graders read the file the model writes, named with today's date, through .eval/.
d=$(date +%Y%m%d) && mkdir -p .eval && echo '.eval/' >> .git/info/exclude
ln -s "../.reviews/REV-$d-discount-rounding.md" .eval/review.md
