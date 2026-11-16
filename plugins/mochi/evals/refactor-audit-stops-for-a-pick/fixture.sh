#!/usr/bin/env bash
# Three checkout handlers each repeat the member discount rule, so every
# pricing change edits all three.
set -euo pipefail
git init -q -b main
git config user.name eval && git config user.email eval@example.invalid
mkdir -p src/checkout
cat > CLAUDE.md <<'X'
# Shop

A TypeScript checkout library. No build step; tests run with `node --test`.
X
for handler in cart invoice refund; do
cat > src/checkout/$handler.ts <<X
export const ${handler}Amount = (amount: number, isMember: boolean): number => {
    // Members get 5% off orders over 100.
    if (isMember && amount > 100) return Math.round(amount * 0.95 * 100) / 100;
    return amount;
};
X
done
cat > src/checkout/cart.test.ts <<'X'
import { strictEqual } from "node:assert";
import { test } from "node:test";
import { cartAmount } from "./cart";

test("members get 5% off over 100", () => {
    strictEqual(cartAmount(200, true), 190);
});
X
git add -A && git commit -q -m "feat: checkout handlers"
git remote add origin https://example.invalid/shop.git
git update-ref refs/remotes/origin/main main
git symbolic-ref refs/remotes/origin/HEAD refs/remotes/origin/main
