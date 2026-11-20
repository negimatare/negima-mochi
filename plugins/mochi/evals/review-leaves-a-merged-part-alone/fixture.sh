#!/usr/bin/env bash
# Part 2 is stacked on part 1, which is now squash-merged into main; part 2
# calls part 1's `euros`, which has a High bug. The squash gives part 1's
# commit a new hash on main. See _shared/order-exports-stack.sh.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/../_shared/shop-lib.sh"
source "$(dirname "${BASH_SOURCE[0]}")/../_shared/order-exports-stack.sh"
git switch -q main
git merge -q --squash feat/order-exports-1-monthly-csv
git commit -q -m "feat(exports): monthly CSV for finance (#41)"
git push -q origin main
git switch -q feat/order-exports-2-customer-statement
finish_shop
