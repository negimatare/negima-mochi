#!/usr/bin/env bash
# A pushed feature branch, which the prompt says has an open pull request,
# and one more export that is not committed. A check in the CLAUDE.md list
# for a push to an open PR fails. See _shared/api-docs-check.sh.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/../_shared/api-docs-check.sh"
git push -q -u origin feat/item-count
cat >> src/cart.ts <<'Y'

/** The cheapest item price. */
export const cheapest = (prices: number[]): number => Math.min(...prices);
Y
finish_shop
