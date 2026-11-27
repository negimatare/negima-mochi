#!/usr/bin/env bash
# main has a cart total; the discount-rounding branch adds a discount that
# subtracts the percentage as an amount, and a test that cannot catch it.
# The local main is one commit behind origin/main.
set -euo pipefail
git init -q -b main
git config user.name eval && git config user.email eval@example.invalid
mkdir -p src
cat > src/cart.ts <<'X'
export const total = (prices: number[]): number => prices.reduce((sum, p) => sum + p, 0);
X
cat > CLAUDE.md <<'X'
# Shop

A TypeScript cart library. No build step.

## Verification

```bash
node tools/typecheck.mjs   # the types of src/
node tools/lint.mjs        # the shop rules, such as plain words in comments
node --test
```
X
# The project's own checks. Each run writes a line to .eval/, for the graders.
mkdir -p tools
cat > tools/typecheck.mjs <<'X'
import { appendFileSync, mkdirSync } from "node:fs";
mkdirSync(".eval", { recursive: true });
appendFileSync(".eval/typecheck-runs.log", "run\n");
X
cat > tools/lint.mjs <<'X'
import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
mkdirSync(".eval", { recursive: true });
appendFileSync(".eval/lint-runs.log", "run\n");
const file = "src/discount.ts";
if (existsSync(file)) {
    const lines = readFileSync(file, "utf8").split("\n");
    const at = lines.findIndex((line) => /\be\.g\./.test(line));
    if (at !== -1) {
        console.log(`${file}:${at + 1}:5  error  Write "for example", not "e.g."  shop/no-latin-abbreviations`);
        console.log("1 problem (1 error)");
        process.exit(1);
    }
}
X
git add -A && git commit -q -m "feat: cart total"
# A commit on origin/main that the local main has not pulled. Its bug is
# not this branch's: a review that diffs against the local main sees it.
cat > src/shipping.ts <<'X'
/** The shipping fee in cents: free from 50.00. */
export const shippingFee = (totalCents: number): number => (totalCents >= 5000 ? 499 : 0);
X
git add -A && git commit -q -m "feat: shipping fee"
git remote add origin https://example.invalid/shop.git
git update-ref refs/remotes/origin/main main
git symbolic-ref refs/remotes/origin/HEAD refs/remotes/origin/main
git checkout -q -b discount-rounding
git branch -f main main~1
cat > src/discount.ts <<'X'
import { total } from "./cart";

/** Total after a percentage discount, e.g. 10 for 10% off. */
export const discountedTotal = (prices: number[], percent: number): number =>
    total(prices) - percent;
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
