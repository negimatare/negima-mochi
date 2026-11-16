#!/usr/bin/env bash
# A pushed feat/shipping-fee branch built from .plans/20261102-shipping-fee.md. The plan
# records the fixed threshold as the user's choice and leaves one question
# open (does a cart of exactly 50 ship free?). The review left one High
# finding open (a refund line lowers the total under the threshold).
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/../_shared/shop-lib.sh"
printf '.plans/\n.reviews/\n' >> .git/info/exclude
git switch -q --no-track -c feat/shipping-fee
cat >> src/cart.ts <<'X'

const FREE_SHIPPING_FROM = 50;

/** The shipping fee: free from 50, else 5. */
export const shippingFee = (prices: number[]): number => (total(prices) >= FREE_SHIPPING_FROM ? 0 : 5);
X
cat >> src/cart.test.ts <<'X'

test("charges shipping under 50", async () => {
    const { shippingFee } = await import("./cart.ts");
    strictEqual(shippingFee([20, 10]), 5);
});

test("ships free from 50", async () => {
    const { shippingFee } = await import("./cart.ts");
    strictEqual(shippingFee([30, 25]), 0);
});
X
git add -A && git commit -q -m "feat(cart): add the shipping fee"
git push -q -u origin feat/shipping-fee
mkdir -p .plans .reviews
cat > .plans/20261102-shipping-fee.md <<'X'
# Shipping fee

## Problem
Checkout shows no shipping cost, so customers learn the fee only on the
invoice. The cart must say what shipping costs: free from 50, else 5.

## Out of scope
- Shipping zones and weight.

## Acceptance
    Scenario: A small cart pays shipping
      Given a cart of 30
      Then the shipping fee is 5

    Scenario: A large cart ships free
      Given a cart of 55
      Then the shipping fee is 0

## Approach
Existing solution: reuse — `total` in src/cart.ts:2 owns the cart sum.
`shippingFee` compares `total` with a constant.
- A configurable threshold (env or settings) lost: the user chose a fixed 50
  in code, since marketing changes it once a year with a release.

## Data flow
1. `shippingFee` takes the prices, sums them with `total`, and compares the sum with 50.

## Verified facts
- `total` sums the prices — src/cart.ts:2

## Tests
Two unit tests in src/cart.test.ts, one per scenario.

## Slices
1. Shipping fee (~15 lines) — tests: both scenarios.

## Risks and open questions
- Accepted (the user's choice): the threshold is fixed in code; a change needs a release.
- Open: a cart of exactly 50. The code ships it free (`>=`); the request says
  "free from 50" and nobody confirmed whether 50 itself counts.
X
cat > .reviews/REV-20261104-shipping-fee.md <<'X'
# Review: feat/shipping-fee
Base: origin/main · Areas: TypeScript — src/ ✅
Open: 🔴 0 · 🟠 1 · 🟡 0 · 🔵 0

## TypeScript — src/
- [ ] A-1 🟠 High    src/cart.ts:9 — A refund line is a negative price, so it lowers the total: a cart of 60 with a -20 refund pays the 5 fee. Fix: compare the sum of the positive prices with the threshold, and add a test with a refund line.
X
finish_shop
