#!/usr/bin/env bash
# useOrders already has a test that mocks the contexts module, a neighbour to copy.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/../_shared/shop-web.sh"
cat > src/features/orders/hooks/useOrders.test.tsx <<'X'
import { renderHook, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { useOrders } from "./useOrders";

vi.mock("@shop/contexts", () => ({
    useOrdersClient: () => ({ listOrders: async () => [{ id: "o-1", customerId: "c-1", total: 10, status: "paid" }] }),
}));

it("loads the orders", async () => {
    const { result } = renderHook(() => useOrders());
    await waitFor(() => expect(result.current.status).toBe("success"));
});
X
git add -A && git commit -q -m "feat: shop web"
