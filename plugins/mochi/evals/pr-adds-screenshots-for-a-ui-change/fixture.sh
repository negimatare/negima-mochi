#!/usr/bin/env bash
# A pushed feat/item-count-summary branch that changes the markup of the cart
# summary component: it adds a line with the item count. Two stub PNGs,
# shots/before.png and shots/after.png, are in shots/, which git ignores.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/../_shared/cart-summary.sh"
mkdir -p shots && printf "\x89PNG\r\n\x1a\n" > shots/before.png && cp shots/before.png shots/after.png
printf "shots/\n" >> .git/info/exclude
finish_shop
