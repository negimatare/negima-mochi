#!/usr/bin/env bash
# Part 2 is stacked on part 1, and both are pushed. A review fix is committed
# on part 1 and not pushed, and part 2 is rebased onto it locally, so part 2
# has diverged from its upstream. See _shared/order-exports-stack.sh.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/../_shared/shop-lib.sh"
source "$(dirname "${BASH_SOURCE[0]}")/../_shared/order-exports-stack.sh"
git switch -q feat/order-exports-1-monthly-csv
sed -i.bak 's|cents / 10)|cents / 100)|' src/exports.ts && rm src/exports.ts.bak
git add src/exports.ts && git commit -q -m "fix(exports): divide the cents by 100"
git switch -q feat/order-exports-2-customer-statement
git rebase -q feat/order-exports-1-monthly-csv
finish_shop
