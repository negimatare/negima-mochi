#!/usr/bin/env bash
# OrderList renders every order as a DOM row.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/../_shared/shop-web.sh"
git add -A && git commit -q -m "feat: shop web"
