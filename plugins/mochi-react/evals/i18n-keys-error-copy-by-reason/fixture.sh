#!/usr/bin/env bash
# useOrders already reports a LoadError reason that OrderList ignores.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/../_shared/shop-web.sh"
git add -A && git commit -q -m "feat: shop web"
