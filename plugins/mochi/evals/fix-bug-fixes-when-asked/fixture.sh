#!/usr/bin/env bash
# The cart total adds floats, so 0.1 + 0.2 is 0.30000000000000004.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/../_shared/shop-lib.sh"
finish_shop
