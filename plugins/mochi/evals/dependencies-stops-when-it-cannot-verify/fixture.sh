#!/usr/bin/env bash
# The npm registry is unreachable from eval runs, so no zod version can be verified.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/../_shared/shop-lib.sh"
finish_shop
