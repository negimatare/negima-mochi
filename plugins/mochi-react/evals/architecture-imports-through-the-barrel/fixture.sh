#!/usr/bin/env bash
# OrdersPage already reaches into the orders slice's internals, a neighbour to copy.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/../_shared/shop-web.sh"
cat > src/pages/OrdersPage.tsx <<'X'
import { OrderList } from "@shop/features/orders/components/OrderList";
import { OrdersToolbar } from "@shop/features/orders/components/OrdersToolbar";

export const OrdersPage = () => (
    <main>
        <OrdersToolbar />
        <OrderList />
    </main>
);
X
git add -A && git commit -q -m "feat: shop web"
