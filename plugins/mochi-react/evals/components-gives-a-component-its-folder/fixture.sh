#!/usr/bin/env bash
# PriorityTag sits flat in components/ with inline styles, a neighbour to copy.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/../_shared/shop-web.sh"
cat > src/features/orders/components/PriorityTag.tsx <<'X'
export const PriorityTag = ({ priority }: { priority: "low" | "high" }) => (
    <span style={{ borderRadius: 4, color: priority === "high" ? "#b10e1c" : "#616161", padding: "0 4px" }}>{priority}</span>
);
X
git add -A && git commit -q -m "feat: shop web"
