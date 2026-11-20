#!/usr/bin/env bash
# A pushed feat/item-count-summary branch that changes the markup of the cart
# summary component: it adds a line with the item count.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/../_shared/cart-summary.sh"
finish_shop
