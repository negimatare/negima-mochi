#!/usr/bin/env bash
# OrderSummary in the orders slice already imports the customers slice, a neighbour to copy.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/../_shared/shop-web.sh"
mkdir -p src/features/orders/components/OrderSummary
cat > src/features/orders/components/OrderSummary/OrderSummary.tsx <<'X'
import { Text } from "@fluentui/react-components";
import { formatCustomerName, type Customer } from "@shop/features/customers";
import type { Order } from "../../domain/order";

export const OrderSummary = ({ order, customer }: { order: Order; customer: Customer }) => (
    <Text>{order.id} for {formatCustomerName(customer)}</Text>
);
X
echo 'export { OrderSummary } from "./OrderSummary";' > src/features/orders/components/OrderSummary/index.ts
git add -A && git commit -q -m "feat: shop web"
