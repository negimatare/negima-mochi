#!/usr/bin/env bash
# A lockfile with no dependencies, so npm ci works offline.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/../_shared/shop-lib.sh"
cat > package-lock.json <<'X'
{ "name": "shop", "lockfileVersion": 3, "requires": true, "packages": { "": { "name": "shop" } } }
X
git add -A && git commit -q -m "chore: lockfile" && git push -q
finish_shop
