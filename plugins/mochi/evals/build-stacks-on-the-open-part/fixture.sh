#!/usr/bin/env bash
# Part 1 of a stacked split is pushed on its own branch but not merged; part 2 builds on it.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/../_shared/shop-lib.sh"
mkdir -p .plans
echo '.plans/' >> .git/info/exclude
cat > .plans/20261102-order-exports.md <<'X'
# Order exports — split into parts

Build the parts in order, each on its own branch and pull request, each
stacked on the part before it.

1. .plans/20261102-order-exports-1-monthly-csv.md — finance downloads a month's orders. Ready to build.
2. .plans/20261102-order-exports-2-customer-csv.md — support exports one customer's orders. Stacked on part 1.

Dropped with the user's agreement: nothing.
X
cat > .plans/20261102-order-exports-2-customer-csv.md <<'X'
# Order exports: support's per-customer CSV

Part 2 of 2 of .plans/20261102-order-exports.md. Stacked on part 1: build on its
branch once it is pushed, and re-check this plan first: the code under it will
have changed.

## Problem
Support answers "what did this customer order?" by searching the admin screen.

## Out of scope
- The Monday email.

## Acceptance
Scenario: support exports one customer's orders for a month
  Given September 2026 orders from customers c-1 and c-2
  When support exports customer c-1's September 2026 orders
  Then the CSV holds only c-1's orders, with the same header and columns as finance's

## Approach
Existing solution: change — part 1's `exportOrders(orders, month)` gains an
optional third argument, `customerId`. Without it, finance's export is
unchanged.

## Data flow
1. Support passes a month and a customer id to `exportOrders`, which keeps that customer's orders in that month.

## Verified facts
- `exportOrders(orders, month)` writes the CSV, header first — src/exports.ts:4 (part 1)
- Each order carries a `customerId` — src/exports.ts:1 (part 1)
- Finance's month export has a test — src/exports.test.ts (part 1)

## Tests
One unit test for the customer filter in src/exports.test.ts; part 1's month
test stays as it is and guards finance's export.

## Slices
1. The customer filter (about 15 lines) — tests: only c-1's September orders.

## Risks and open questions
- None.
X
git switch -q --no-track -c feat/order-exports-1-monthly-csv
cat > src/exports.ts <<'X'
export type Order = { id: string; customerId: string; placedAt: string; total: number };

/** CSV of the orders placed in a month ("2026-09"), header first. */
export const exportOrders = (orders: Order[], month: string): string =>
    ["id,date,total", ...orders.filter((o) => o.placedAt.startsWith(month)).map((o) => `${o.id},${o.placedAt},${o.total}`)].join("\n");
X
cat > src/exports.test.ts <<'X'
import { strictEqual } from "node:assert";
import { test } from "node:test";
import { exportOrders } from "./exports.ts";

test("keeps only the month's orders", () => {
    const orders = [
        { id: "o-1", customerId: "c-1", placedAt: "2026-09-02", total: 10 },
        { id: "o-2", customerId: "c-1", placedAt: "2026-10-01", total: 20 },
    ];
    strictEqual(exportOrders(orders, "2026-09"), "id,date,total\no-1,2026-09-02,10");
});
X
git add src && git commit -q -m "feat(exports): monthly CSV for finance"
git push -q -u origin feat/order-exports-1-monthly-csv
git switch -q main
finish_shop
