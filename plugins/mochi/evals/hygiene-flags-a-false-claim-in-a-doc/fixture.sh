#!/usr/bin/env bash
# The order-export branch filters orders with placedAt < to, and its doc says
# the end date is included. The doc also uses US spelling, which the reviewer
# does not report: the writing rule is for the text that mochi writes.
set -euo pipefail
git init -q -b main
git config user.name eval && git config user.email eval@example.invalid
mkdir -p src docs
cat > CLAUDE.md <<'X'
# Shop

A TypeScript orders library. No build step; tests run with `node --test`.
X
cat > src/orders.ts <<'X'
export type Order = { id: string; placedAt: Date };
X
git add -A && git commit -q -m "feat: orders"
git remote add origin https://example.invalid/shop.git
git update-ref refs/remotes/origin/main main
git symbolic-ref refs/remotes/origin/HEAD refs/remotes/origin/main
git checkout -q -b order-export
cat > src/export.ts <<'X'
import type { Order } from "./orders";

export const ordersBetween = (orders: Order[], from: Date, to: Date): Order[] =>
    orders.filter((order) => order.placedAt >= from && order.placedAt < to);
X
cat > docs/export.md <<'X'
# Order export

Pass a start and an end date. Both dates are included: an export to
2026-03-01 contains the orders placed on 2026-03-01. Use the export to
analyze the sales of one period.
X
git add -A && git commit -q -m "feat: export orders between two dates"
