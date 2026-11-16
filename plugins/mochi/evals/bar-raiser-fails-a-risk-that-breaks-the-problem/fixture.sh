#!/usr/bin/env bash
# The plan promises that a customer's code wins over the store promotion, then
# accepts as a risk that the 30% cap trims the largest discount first, which
# is often the customer's code. Its other accepted risk is harmless.
set -euo pipefail
git init -q -b main
git config user.name eval && git config user.email eval@example.invalid
mkdir -p src .plans
printf '.plans/\n' >> .git/info/exclude
cat > CLAUDE.md <<'X'
# Shop

A TypeScript pricing library. No build step; tests run with `node --test`.
X
cat > src/discounts.ts <<'X'
const MAX_DISCOUNT = 0.3;

export type Discount = { source: "store"; rate: number };

/** Trims the discounts so they add up to at most 30%, cutting the largest first. */
export const applyCap = (discounts: Discount[]): Discount[] => {
    let excess = discounts.reduce((sum, d) => sum + d.rate, 0) - MAX_DISCOUNT;
    return [...discounts]
        .sort((a, b) => b.rate - a.rate)
        .map((d) => {
            const cut = Math.max(0, Math.min(d.rate, excess));
            excess -= cut;
            return { ...d, rate: d.rate - cut };
        });
};

/** The price after the store promotions. */
export const discountedPrice = (price: number, discounts: Discount[]): number =>
    price * (1 - applyCap(discounts).reduce((sum, d) => sum + d.rate, 0));
X
cat > src/discounts.test.ts <<'X'
import { strictEqual } from "node:assert";
import { test } from "node:test";
import { discountedPrice } from "./discounts.ts";

test("caps the store promotions at 30%", () => {
    strictEqual(discountedPrice(100, [{ source: "store", rate: 0.2 }, { source: "store", rate: 0.2 }]), 70);
});
X
git add -A && git commit -q -m "feat: store promotions with a cap"
cat > .plans/20261102-customer-codes.md <<'X'
# Customer discount codes

## Problem
Support sends loyal customers personal discount codes, but checkout applies
only store promotions, so support refunds the difference by hand. Checkout
must apply a customer's code. When a code and a store promotion both apply,
the customer's code wins: the customer always gets the full rate of their code.

## Out of scope
- Creating or sending codes: support already does it.
- Codes that stack with each other: one code per order.

## Acceptance
    Scenario: A code applies on its own
      Given a price of 100 and a customer code of 20%
      Then the price is 80

    Scenario: A code and a store promotion both apply
      Given a price of 100, a store promotion of 10% and a customer code of 15%
      Then the price is 75

## Approach
Existing solution: change — `applyCap` in src/discounts.ts:6 owns the 30% cap.
`Discount.source` gains `"customer"`, and `discountedPrice` receives the
customer's code as one more discount, so the cap stays in one place.
- A separate price function for codes lost: it would be a second home for the cap.

## Data flow
1. Checkout passes the store promotions and the customer's code to `discountedPrice`.
2. `applyCap` trims the discounts to 30% in total, and `discountedPrice` applies the rest.

## Verified facts
- The cap is 30% and trims the largest discount first — src/discounts.ts:1,6-15
- `discountedPrice` is the only caller of `applyCap` — src/discounts.ts:18

## Tests
Two unit tests in src/discounts.test.ts, one per scenario.

## Slices
1. Customer codes (~20 lines) — tests: both scenarios.

## Risks and open questions
- Accepted: an order with a code and a store promotion can reach the cap.
  The cap then trims the largest discount first, which is often the
  customer's code. Changing how the cap trims is out of scope.
- Accepted: a code is not checked for expiry here; support only sends live codes.
X
