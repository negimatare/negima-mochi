#!/usr/bin/env bash
# AutoRefresh takes its interval as a prop, and a neighbouring test waits in real time.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/../_shared/shop-web.sh"
mkdir -p src/features/orders/components/AutoRefresh
cat > src/features/orders/components/AutoRefresh/AutoRefresh.tsx <<'X'
import { useEffect } from "react";

const REFRESH_MS = 30_000;

/** Calls onRefresh every 30 seconds while it is mounted. */
export const AutoRefresh = ({ onRefresh }: { onRefresh: () => void }) => {
    useEffect(() => {
        const id = setInterval(onRefresh, REFRESH_MS);
        return () => clearInterval(id);
    }, [onRefresh]);
    return null;
};
X
echo 'export { AutoRefresh } from "./AutoRefresh";' > src/features/orders/components/AutoRefresh/index.ts
cat > src/features/orders/components/AutoRefresh/AutoRefresh.tsx <<'X'
import { useEffect } from "react";

/** Calls onRefresh every intervalMs (30 seconds by default) while it is mounted. */
export const AutoRefresh = ({ onRefresh, intervalMs = 30_000 }: { onRefresh: () => void; intervalMs?: number }) => {
    useEffect(() => {
        const id = setInterval(onRefresh, intervalMs);
        return () => clearInterval(id);
    }, [onRefresh, intervalMs]);
    return null;
};
X
cat > src/features/orders/hooks/useOrders.test.tsx <<'X'
import { renderHook } from "@testing-library/react";
import { expect, it } from "vitest";
import { useOrders } from "./useOrders";

it("starts loading", async () => {
    const { result } = renderHook(() => useOrders());
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(result.current.status).toBe("loading");
});
X
git add -A && git commit -q -m "feat: shop web"
