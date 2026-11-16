#!/usr/bin/env bash
# Part 1 of a split plan is pushed on its own branch but not merged; part 2 must wait for it.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/../_shared/shop-lib.sh"
mkdir -p .plans
echo '.plans/' >> .git/info/exclude
cat > .plans/20261102-order-exports.md <<'X'
# Order exports — split into parts

Build the parts in order, each on its own branch and pull request.

1. .plans/20261102-order-exports-1-monthly-csv.md — finance downloads a month's orders. Ready to build.
2. .plans/20261102-order-exports-2-customer-csv.md — support exports one customer's orders. Build after part 1 is merged.

Dropped with the user's agreement: nothing.
X
cat > .plans/20261102-order-exports-2-customer-csv.md <<'X'
# Order exports: support's per-customer CSV

Part 2 of 2 of .plans/20261102-order-exports.md. Build after part 1 is merged, and
re-check this plan first: the code under it will have changed.

## Problem
Support answers "what did this customer order?" by searching the admin screen.

## Out of scope
- The Monday email.

## Acceptance
Scenario: support exports one customer's orders
  Given orders from several customers
  When support exports the orders of customer c-1
  Then the CSV holds only c-1's orders

## Approach
Existing solution: change — part 1's `exportOrders` gains a customer filter.

## Data flow
1. Support passes a customer id to `exportOrders`, which keeps that customer's orders.

## Verified facts
- `exportOrders` exists after part 1 — src/exports.ts (part 1)

## Tests
One unit test for the customer filter.

## Slices
1. The customer filter — tests: only c-1's orders.

## Risks and open questions
- None.
X
git switch -q --no-track -c feat/order-exports-1-monthly-csv
cat > src/exports.ts <<'X'
/** CSV of the orders placed in a month ("2026-09"). */
export const exportOrders = (orders: { id: string; placedAt: string; total: number }[], month: string): string =>
    ["id,date,total", ...orders.filter((o) => o.placedAt.startsWith(month)).map((o) => `${o.id},${o.placedAt},${o.total}`)].join("\n");
X
git add src/exports.ts && git commit -q -m "feat(exports): monthly CSV for finance"
git push -q -u origin feat/order-exports-1-monthly-csv
git switch -q main
finish_shop
