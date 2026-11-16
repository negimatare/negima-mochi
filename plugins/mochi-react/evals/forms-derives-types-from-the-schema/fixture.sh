#!/usr/bin/env bash
# The app depends on react-hook-form, @hookform/resolvers, and zod 4.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/../_shared/shop-web.sh"
git add -A && git commit -q -m "feat: shop web"
