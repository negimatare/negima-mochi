#!/usr/bin/env bash
# An approved two-slice plan, built from main.
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
Existing solution: change — `total` in src/cart.ts:2 owns the order total.
`total` takes an optional second argument `{ member: boolean }`.

## Data flow
1. One component: `total` in `src/cart.ts`.

## Verified facts
- `total` sums the prices — src/cart.ts:2

## Tests
Unit tests in src/cart.test.ts, one per scenario.

## Slices
1. Members get 5% off orders over 100 — tests: a member over 100; a member at 100.
2. Totals are rounded to cents — tests: items priced 0.1 and 0.2 total 0.3.

## Risks and open questions
- None.
X
finish_shop
