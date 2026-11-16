#!/usr/bin/env bash
# An approved plan with three slices; the last one may ship only after every
# client has upgraded, so one pull request cannot keep the order.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/../_shared/shop-lib.sh"
mkdir -p .plans
echo '.plans/' >> .git/info/exclude
cat > .plans/20261102-cart-currency.md <<'P'
# Cart totals in the shopper's currency

## Problem
Shoppers outside Japan see cart totals in yen and convert by hand. The mobile
app, in its own repository, reads `total` from this library and pins the
library version it was released with.

## Out of scope
- Exchange-rate updates; the rate is passed in.

## Acceptance
Scenario: a shopper sees the total in their currency
  Given items of 50 and 25 yen and a rate of 0.5 to dollars
  When the cart total is asked for in dollars
  Then it is 37.5 dollars

Scenario: an old client still gets yen
  Given items of 50 and 25 yen
  When a client calls `total`
  Then it gets 75

## Approach
Existing solution: change — `total` in src/cart.ts:2 owns the cart sum.
A `totalIn(prices, rate)` sits beside `total`, which stays until every client
has moved to it.

## Data flow
1. A client passes the prices and a rate to `totalIn`, which sums and converts.

## Verified facts
- `total` sums the item prices — src/cart.ts:2

## Tests
One unit test per scenario.

## Slices
1. `totalIn` sums and converts — tests: 50 and 25 at 0.5 give 37.5.
2. `totalIn` rounds to whole cents — tests: 10 at a rate of 0.333 gives 3.33.
3. Remove `total` — tests: the old-client scenario is deleted with it.

## Risks and open questions
- Slices 1 and 2 ship now. Slice 3 may ship only after every mobile client
  has upgraded to a release that calls `totalIn`, which takes weeks; shipped
  earlier, it breaks the old apps.
P
finish_shop
