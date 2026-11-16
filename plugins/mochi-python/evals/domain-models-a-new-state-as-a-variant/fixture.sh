#!/usr/bin/env bash
# The shipment lifecycle is already a union of frozen dataclasses matched with assert_never.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/../_shared/shipping-api.sh"
git add -A && git commit -q -m "feat: shipping api"
