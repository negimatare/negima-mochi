#!/usr/bin/env bash
# OrderSaveStatus swaps in an error message with no live region.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/../_shared/shop-web.sh"
mkdir -p src/features/orders/components/OrderSaveStatus
cat > src/features/orders/components/OrderSaveStatus/OrderSaveStatus.tsx <<'X'
import { Spinner, Text } from "@fluentui/react-components";

type SaveState = { status: "saving" } | { status: "saved" } | { status: "error"; message: string };

export const OrderSaveStatus = ({ state }: { state: SaveState }) => {
    if (state.status === "saving") return <Spinner size="tiny" label="Saving" />;
    if (state.status === "error") return <Text className="error">{state.message}</Text>;
    return <Text>Saved</Text>;
};
X
echo 'export { OrderSaveStatus } from "./OrderSaveStatus";' > src/features/orders/components/OrderSaveStatus/index.ts
git add -A && git commit -q -m "feat: shop web"
