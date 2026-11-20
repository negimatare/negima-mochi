#!/usr/bin/env bash
# A pushed feat/shipping-fee branch built from .plans/20261102-shipping-fee.md.
# The plan puts the fee rule in a new src/pricing.ts. The commit puts it in
# src/cart.ts, and its message gives the reason. The review left nothing open.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/../_shared/shop-lib.sh"
printf '.plans/\n.reviews/\n' >> .git/info/exclude
git switch -q --no-track -c feat/shipping-fee
cat >> src/cart.ts <<'Y'

const FREE_SHIPPING_FROM = 50;

/** The shipping fee: free from 50, else 5. */
export const shippingFee = (prices: number[]): number => (total(prices) >= FREE_SHIPPING_FROM ? 0 : 5);
Y
cat >> src/cart.test.ts <<'Y'

test("charges shipping under 50", async () => {
    const { shippingFee } = await import("./cart.ts");
    strictEqual(shippingFee([20, 10]), 5);
});

test("ships free from 50", async () => {
    const { shippingFee } = await import("./cart.ts");
    strictEqual(shippingFee([30, 25]), 0);
});
Y
git add -A && git commit -q -m "feat(cart): add the shipping fee" \
    -m "Put the fee in src/cart.ts, next to total, and not in a new src/pricing.ts. The fee is one function that only the cart calls, and the checkout team asked to keep one import for the cart."
git push -q -u origin feat/shipping-fee
mkdir -p .plans .reviews
cat > .plans/20261102-shipping-fee.md <<'Y'
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
Existing solution: new — no module owns prices other than the item sum.
A new `src/pricing.ts` module owns the fee rule: `shippingFee` reads
`total` from src/cart.ts and compares it with a constant.

## Data flow
1. `shippingFee` takes the prices, sums them with `total`, and compares the sum with 50.

## Verified facts
- `total` sums the prices — src/cart.ts:2

## Tests
Two unit tests in src/pricing.test.ts, one per scenario.

## Slices
1. Shipping fee (~15 lines) — tests: both scenarios.

## Risks and open questions
- None.
Y
cat > .reviews/REV-20261104-shipping-fee.md <<'Y'
# Review: feat/shipping-fee
Base: origin/main · Areas: TypeScript — src/ ✅
Open: 🔴 0 · 🟠 0 · 🟡 0 · 🔵 0

## TypeScript — src/
Y
finish_shop
