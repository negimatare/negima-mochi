#!/usr/bin/env bash
# src/utils/format.ts already holds a date helper only the orders feature uses, a neighbour to copy.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/../_shared/shop-web.sh"
mkdir -p src/utils
cat > src/utils/format.ts <<'X'
/** An order date such as "Oct 23, 2026". */
export const formatOrderDate = (date: Date): string => date.toLocaleDateString("en-US", { dateStyle: "medium" });
X
git add -A && git commit -q -m "feat: shop web"
