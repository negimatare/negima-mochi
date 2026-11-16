#!/usr/bin/env bash
# An approved plan whose design rests on src/pricing.ts, which does not exist.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/../_shared/shop-lib.sh"
mkdir -p .plans
echo '.plans/' >> .git/info/exclude
cat > .plans/20261102-member-discount.md <<'X'
# Member discount

## Problem
Members pay full price, and support refunds the difference by hand.

## Out of scope
- Discounts for anyone who is not a member.

## Acceptance
Scenario: a member's order over 100 gets 5% off
  Given a member buying items priced 80 and 40
  When the total is computed
  Then it is 114

Scenario: a member's order of 100 or less pays full price
  Given a member buying items priced 60 and 40
  When the total is computed
  Then it is 100

## Approach
Existing solution: reuse — `applyMemberDiscount` in src/pricing.ts:3 already
applies the member rate. `total` takes `{ member: boolean }` and passes the sum
through it.

## Data flow
1. `total` in `src/cart.ts` sums the prices.
2. `applyMemberDiscount` in `src/pricing.ts` applies 5% off amounts over 100.

## Verified facts
- `total` sums the prices — src/cart.ts:2
- `applyMemberDiscount(amount)` returns 95% of amounts over 100 — src/pricing.ts:3

## Tests
Unit tests in src/cart.test.ts, one per scenario.

## Slices
1. Members get 5% off orders over 100 — tests: a member over 100; a member at 100.

## Risks and open questions
- None.
X
finish_shop
