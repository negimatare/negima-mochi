# Sourced by fixture.sh: the shop-lib.sh repository with two stacked parts,
# both pushed and not merged. Part 1's `euros` divides by 10, not 100, and
# part 2's customer statement calls it, so a review of part 2 against part 1
# finds a High bug in a line that part 1 added. Call finish_shop after it.
source "$(dirname "${BASH_SOURCE[0]}")/shop-lib.sh"
mkdir -p .plans
printf '.plans/\n.reviews/\n' >> .git/info/exclude
cat > .plans/20261102-order-exports.md <<'X'
# Order exports — split into parts

Build the parts in order, each on its own branch and pull request, each
stacked on the part before it.

1. .plans/20261102-order-exports-1-monthly-csv.md — finance downloads a month's orders.
2. .plans/20261102-order-exports-2-customer-statement.md — support gets one customer's statement. Stacked on part 1.

Dropped with the user's agreement: nothing.
X
cat > .plans/20261102-order-exports-2-customer-statement.md <<'X'
# Order exports: support's customer statement

Part 2 of 2 of .plans/20261102-order-exports.md. Stacked on part 1.

## Problem
Support cannot tell a customer how much they spent.

## Acceptance
Scenario: support gets one customer's statement
  Given orders from customers c-1 and c-2
  When support asks for c-1's statement
  Then it gives c-1's order count and total spend in euros

## Approach
Existing solution: reuse part 1's `euros` for the amount.

## Slices
1. The statement (about 15 lines) — tests: c-1's order count.
X
git switch -q --no-track -c feat/order-exports-1-monthly-csv
cat > src/exports.ts <<'X'
export type Order = { id: string; customerId: string; placedAt: string; totalCents: number };

/** An amount in cents as euros with two decimals: 1250 gives "12.50". */
export const euros = (cents: number): string => (cents / 10).toFixed(2);

/** CSV of the orders placed in a month ("2026-09"), header first. */
export const exportOrders = (orders: Order[], month: string): string =>
    ["id,date,total", ...orders.filter((o) => o.placedAt.startsWith(month)).map((o) => `${o.id},${o.placedAt},${euros(o.totalCents)}`)].join("\n");
X
cat > src/exports.test.ts <<'X'
import { strictEqual } from "node:assert";
import { test } from "node:test";
import { exportOrders } from "./exports.ts";

test("keeps only the month's orders", () => {
    const orders = [
        { id: "o-1", customerId: "c-1", placedAt: "2026-09-02", totalCents: 1000 },
        { id: "o-2", customerId: "c-1", placedAt: "2026-10-01", totalCents: 2000 },
    ];
    strictEqual(exportOrders(orders, "2026-09").split("\n").length, 2);
});
X
git add src && git commit -q -m "feat(exports): monthly CSV for finance"
git push -q -u origin feat/order-exports-1-monthly-csv
git switch -q --no-track -c feat/order-exports-2-customer-statement
cat > src/statement.ts <<'X'
import { euros, type Order } from "./exports.ts";

/** One customer's order count and total spend, for support. */
export const customerStatement = (orders: Order[], customerId: string): string => {
    const own = orders.filter((o) => o.customerId === customerId);
    return `${customerId}: ${own.length} orders, ${euros(own.reduce((sum, o) => sum + o.totalCents, 0))} EUR`;
};
X
cat > src/statement.test.ts <<'X'
import { ok } from "node:assert";
import { test } from "node:test";
import { customerStatement } from "./statement.ts";

test("counts only the customer's orders", () => {
    const orders = [
        { id: "o-1", customerId: "c-1", placedAt: "2026-09-02", totalCents: 1250 },
        { id: "o-2", customerId: "c-2", placedAt: "2026-09-03", totalCents: 500 },
    ];
    ok(customerStatement(orders, "c-1").startsWith("c-1: 1 orders"));
});
X
git add src && git commit -q -m "feat(exports): customer statement for support"
git push -q -u origin feat/order-exports-2-customer-statement
