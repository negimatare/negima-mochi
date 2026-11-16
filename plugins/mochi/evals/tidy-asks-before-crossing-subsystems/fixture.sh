#!/usr/bin/env bash
# web/ repeats api/'s money format, and the apps may not import each other, so one home for it crosses both.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/../_shared/shop-lib.sh"
mkdir -p api web
cat >> CLAUDE.md <<'X'

## Layout

- `api/` is the server and `web/` is the browser app. They deploy separately,
  and neither imports the other's code.
X
cat > api/money.ts <<'X'
/** Cents as a price label, such as "$12.50". */
export const formatMoney = (cents: number): string => `$${(cents / 100).toFixed(2)}`;
X
git add -A && git commit -q -m "feat(api): money format" && git push -q
cat > web/receipt.ts <<'X'
/** One receipt line, such as "Coffee  $3.50". */
export const receiptLine = (name: string, cents: number): string => `${name}  $${(cents / 100).toFixed(2)}`;
X
finish_shop
