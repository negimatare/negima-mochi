#!/usr/bin/env bash
# Part 2 is stacked on part 1, which is not merged; part 2 calls part 1's
# `euros`, which has a High bug. See _shared/order-exports-stack.sh.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/../_shared/shop-lib.sh"
source "$(dirname "${BASH_SOURCE[0]}")/../_shared/order-exports-stack.sh"
finish_shop
