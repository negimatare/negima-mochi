#!/usr/bin/env bash
# Five shipping options are static data for one component.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/../_shared/shop-web.sh"
git add -A && git commit -q -m "feat: shop web"
