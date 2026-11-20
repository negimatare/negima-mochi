#!/usr/bin/env bash
# Part 2 is stacked on part 1, which is not merged; part 2 calls part 1's
# `euros`, which has a High bug. Part 2 has a change to a tracked file that
# is not committed. See _shared/order-exports-stack.sh.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/../_shared/shop-lib.sh"
source "$(dirname "${BASH_SOURCE[0]}")/../_shared/order-exports-stack.sh"
sed -i.bak 's|for support\. \*/|for support, newest first. */|' src/statement.ts && rm src/statement.ts.bak
finish_shop
