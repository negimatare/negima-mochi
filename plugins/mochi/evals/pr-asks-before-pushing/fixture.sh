#!/usr/bin/env bash
# A local feature branch with one commit and no upstream.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/../_shared/shop-lib.sh"
git switch -q --no-track -c feat/item-count
cat >> src/cart.ts <<'X'

/** How many items the cart holds. */
export const itemCount = (prices: number[]): number => prices.length;
X
cat >> src/cart.test.ts <<'X'

test("counts the items", async () => {
    const { itemCount } = await import("./cart.ts");
    strictEqual(itemCount([5, 5, 5]), 3);
});
X
git add -A && git commit -q -m "feat(cart): count the items"
finish_shop
