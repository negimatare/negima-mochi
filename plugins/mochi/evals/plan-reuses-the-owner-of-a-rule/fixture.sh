#!/usr/bin/env bash
# The rule for which orders count in a month lives in billableOrders, named
# for billing. Next to the warehouse XML export the request points at,
# ordersInMonth looks like the answer but takes UTC months and keeps
# cancelled and test orders.
set -euo pipefail
git init -q -b main
git config user.name eval && git config user.email eval@example.invalid
mkdir -p src/billing src/exports src/lib
cat > CLAUDE.md <<'X'
# Shop

A TypeScript orders library. No build step; tests run with `node --test`.
X
cat > src/orders.ts <<'X'
export type Order = {
    id: string;
    placedAt: Date;
    total: number;
    status: "paid" | "cancelled";
    isTest: boolean;
};
X
cat > src/lib/dates.ts <<'X'
export const inRange = (date: Date, from: Date, to: Date): boolean => date >= from && date <= to;
X
cat > src/exports/period.ts <<'X'
import type { Order } from "../orders";

/** Orders placed in a month ("2026-09"). */
export const ordersInMonth = (orders: Order[], month: string): Order[] =>
    orders.filter((o) => o.placedAt.toISOString().slice(0, 7) === month);
X
cat > src/exports/warehouse-xml.ts <<'X'
import type { Order } from "../orders";
import { ordersInMonth } from "./period.ts";

/** The warehouse's monthly pick list: every order placed, whatever its billing state. */
export const warehouseXml = (orders: Order[], month: string): string =>
    `<orders month="${month}">${ordersInMonth(orders, month).map((o) => `<order id="${o.id}"/>`).join("")}</orders>`;
X
cat > src/billing/statement.ts <<'X'
import type { Order } from "../orders";

const TOKYO_OFFSET_MS = 9 * 60 * 60 * 1000;

// Months are Tokyo calendar months: the shop bills in JST.
const tokyoMonth = (date: Date): string => new Date(date.getTime() + TOKYO_OFFSET_MS).toISOString().slice(0, 7);

/** Orders billed in a month ("2026-09"): Tokyo time, no cancelled or test orders. */
export const billableOrders = (orders: Order[], month: string): Order[] =>
    orders.filter((o) => o.status !== "cancelled" && !o.isTest && tokyoMonth(o.placedAt) === month);

export const statementTotal = (orders: Order[], month: string): number =>
    billableOrders(orders, month).reduce((sum, o) => sum + o.total, 0);
X
cat > src/billing/statement.test.ts <<'X'
import { strictEqual } from "node:assert";
import { test } from "node:test";
import { statementTotal } from "./statement.ts";

const order = (placedAt: string, total: number, extra = {}) =>
    ({ id: placedAt, placedAt: new Date(placedAt), total, status: "paid", isTest: false, ...extra }) as const;

test("bills a month in Tokyo time without cancelled or test orders", () => {
    const orders = [
        order("2026-08-31T16:00:00Z", 100),
        order("2026-09-10T00:00:00Z", 50, { status: "cancelled" }),
        order("2026-09-11T00:00:00Z", 70, { isTest: true }),
        order("2026-09-30T16:00:00Z", 30),
    ];
    strictEqual(statementTotal(orders, "2026-09"), 100);
});
X
git add -A && git commit -q -m "feat: monthly statement"
git remote add origin https://example.invalid/shop.git
git update-ref refs/remotes/origin/main main
git symbolic-ref refs/remotes/origin/HEAD refs/remotes/origin/main

# The graders read the file the model writes, named with today's date, through .eval/.
d=$(date +%Y%m%d) && mkdir -p .eval && echo '.eval/' >> .git/info/exclude
ln -s "../.plans/$d-csv-export.md" .eval/plan.md
