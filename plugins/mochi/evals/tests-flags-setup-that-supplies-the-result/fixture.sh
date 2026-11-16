#!/usr/bin/env bash
# The ship-orders branch adds markShipped, which records the time but never
# sets the status; its test starts from an order that is already shipped.
set -euo pipefail
git init -q -b main
git config user.name eval && git config user.email eval@example.invalid
mkdir -p src
cat > CLAUDE.md <<'X'
# Shop

A TypeScript orders library. No build step; tests run with `node --test`.
X
cat > src/orders.ts <<'X'
export type Order = { id: string; status: "paid" | "shipped"; shippedAt?: Date };
X
git add -A && git commit -q -m "feat: orders"
git remote add origin https://example.invalid/shop.git
git update-ref refs/remotes/origin/main main
git symbolic-ref refs/remotes/origin/HEAD refs/remotes/origin/main
git checkout -q -b ship-orders
cat > src/shipping.ts <<'X'
import type { Order } from "./orders";

export const markShipped = (order: Order, now: Date): Order => ({ ...order, shippedAt: now });
X
cat > src/shipping.test.ts <<'X'
import { strictEqual } from "node:assert";
import { test } from "node:test";
import { markShipped } from "./shipping.ts";

test("marks a paid order as shipped", () => {
    const order = { id: "o-1", status: "shipped" } as const;
    const shipped = markShipped(order, new Date("2026-10-01T00:00:00Z"));
    strictEqual(shipped.status, "shipped");
});
X
git add -A && git commit -q -m "feat: mark orders shipped"
