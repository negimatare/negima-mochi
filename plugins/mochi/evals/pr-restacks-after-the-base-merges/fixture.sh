#!/usr/bin/env bash
# Part 2 is stacked on part 1, which has two commits and is now squash-merged
# into main, so a plain rebase onto main replays part 1 and conflicts.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/../_shared/shop-lib.sh"
git switch -q --no-track -c feat/order-exports-1-monthly-csv
cat > src/exports.ts <<'X'
type Order = { id: string; customerId: string; placedAt: string; total: number };

/** CSV of the orders placed in a month ("2026-09"). */
export const exportOrders = (orders: Order[], month: string): string =>
    orders.filter((o) => o.placedAt.startsWith(month)).map((o) => `${o.id},${o.placedAt},${o.total}`).join("\n");
X
git add src/exports.ts && git commit -q -m "feat(exports): monthly CSV for finance"
cat > src/exports.ts <<'X'
type Order = { id: string; customerId: string; placedAt: string; total: number };

/** CSV of the orders placed in a month ("2026-09"), with a header row. */
export const exportOrders = (orders: Order[], month: string): string =>
    ["id,date,total", ...orders.filter((o) => o.placedAt.startsWith(month)).map((o) => `${o.id},${o.placedAt},${o.total}`)].join("\n");
X
git add src/exports.ts && git commit -q -m "feat(exports): add a header row to the monthly CSV"
git push -q -u origin feat/order-exports-1-monthly-csv
git switch -q --no-track -c feat/order-exports-2-customer-csv
cat > src/exports.ts <<'X'
type Order = { id: string; customerId: string; placedAt: string; total: number };

/** CSV of the orders placed in a month ("2026-09"), with a header row, for one customer when given. */
export const exportOrders = (orders: Order[], month: string, customerId?: string): string =>
    ["id,date,total", ...orders
        .filter((o) => o.placedAt.startsWith(month) && (customerId === undefined || o.customerId === customerId))
        .map((o) => `${o.id},${o.placedAt},${o.total}`)].join("\n");
X
cat > src/exports.test.ts <<'X'
import { strictEqual } from "node:assert";
import { test } from "node:test";
import { exportOrders } from "./exports.ts";

test("keeps only the customer's orders", () => {
    const orders = [
        { id: "o-1", customerId: "c-1", placedAt: "2026-09-02", total: 10 },
        { id: "o-2", customerId: "c-2", placedAt: "2026-09-03", total: 20 },
    ];
    strictEqual(exportOrders(orders, "2026-09", "c-1"), "id,date,total\no-1,2026-09-02,10");
});
X
git add src && git commit -q -m "feat(exports): per-customer CSV for support"
git push -q -u origin feat/order-exports-2-customer-csv
# The base's pull request is squash-merged: main gets part 1 as one new commit.
git switch -q main
git merge -q --squash feat/order-exports-1-monthly-csv
git commit -q -m "feat(exports): monthly CSV for finance (#41)"
git push -q origin main
git switch -q feat/order-exports-2-customer-csv
finish_shop
