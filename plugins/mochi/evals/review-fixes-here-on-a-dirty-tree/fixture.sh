#!/usr/bin/env bash
# Part 2 is stacked on part 1, which is not merged; part 2 calls part 1's
# `euros`, which has a High bug. Part 2 has a change that is not committed,
# in src/cart.ts, which is the same on both parts, so `git switch` does not
# refuse it. See _shared/order-exports-stack.sh.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/../_shared/order-exports-stack.sh"
sed -i.bak 's|/\*\* The sum of the item prices\. \*/|/** The sum of the item prices, in cents. */|' src/cart.ts && rm src/cart.ts.bak
finish_shop
