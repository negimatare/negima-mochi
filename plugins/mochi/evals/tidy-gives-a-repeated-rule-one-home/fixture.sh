#!/usr/bin/env bash
# An uncommitted invoice module repeats the member discount rule that memberTotal in src/cart.ts already owns.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/../_shared/shop-lib.sh"
cat >> src/cart.ts <<'X'

/** Members get 5% off orders over 100. */
export const memberTotal = (prices: number[]): number => {
    const sum = total(prices);
    return sum > 100 ? Math.round(sum * 0.95 * 100) / 100 : sum;
};
X
cp src/cart.ts .eval/cart.orig
git add -A && git commit -q -m "feat: member total" && git push -q
cat > src/invoice.ts <<'X'
import { total } from "./cart.ts";

/** The amount on a member's invoice. */
export const invoiceAmount = (prices: number[]): number => {
    const sum = total(prices);
    return sum > 100 ? Math.round(sum * 0.95 * 100) / 100 : sum;
};
X
cat > src/invoice.test.ts <<'X'
import { strictEqual } from "node:assert";
import { test } from "node:test";
import { invoiceAmount } from "./invoice.ts";

test("a member's invoice over 100 is 5% off", () => {
    strictEqual(invoiceAmount([80, 40]), 114);
});
X
finish_shop
