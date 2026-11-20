#!/usr/bin/env bash
# An uncommitted loyalty module with comments that restate the next line, a
# magic number that a named constant can explain, and a "do not change"
# warning. One comment gives a why the code cannot show: an upstream bug.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/../_shared/shop-lib.sh"
cat > src/loyalty.ts <<'X'
import { total } from "./cart.ts";

/** Loyalty points for an order: one point for each full 10 spent. */
export const loyaltyPoints = (prices: number[]): number => {
    // Sum the order.
    const sum = total(prices);
    // Round to cents first: the till sends totals such as 19.999999999 (till-sdk issue #412).
    const cents = Math.round(sum * 100);
    // One point per 1000 cents, rounded down.
    return Math.floor(cents / 1000);
};

/** The number of orders that earned points. */
export const countEarners = (orders: number[][]): number => {
    // Start from zero.
    let count = 0;
    // Go through each order.
    for (const prices of orders) {
        // Only orders with at least one point count.
        if (loyaltyPoints(prices) > 0) {
            // increment the count
            count += 1;
        }
    }
    // Do not change: the weekly report reads this number.
    return count;
};
X
cat > src/loyalty.test.ts <<'X'
import { strictEqual } from "node:assert";
import { test } from "node:test";
import { countEarners, loyaltyPoints } from "./loyalty.ts";

test("one point for each full 10 spent", () => {
    strictEqual(loyaltyPoints([19.99, 0.01]), 2);
});

test("counts the orders that earned points", () => {
    strictEqual(countEarners([[5], [12]]), 1);
});
X
finish_shop
