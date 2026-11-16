#!/usr/bin/env bash
# App renders OrdersPage only; ReportsPage is a heavy, rarely opened screen.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/../_shared/shop-web.sh"
git add -A && git commit -q -m "feat: shop web"
