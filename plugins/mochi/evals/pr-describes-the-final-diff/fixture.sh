#!/usr/bin/env bash
# A pushed branch whose first commit adds a cached item count and whose second replaces it with prices.length.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/../_shared/shop-lib.sh"
git switch -q --no-track -c feat/item-count
cat >> src/cart.ts <<'X'

const counts = new Map<string, number>();

/** How many items the cart holds, cached by cart contents. */
export const itemCount = (prices: number[]): number => {
    const key = prices.join(",");
    if (!counts.has(key)) counts.set(key, prices.reduce((n) => n + 1, 0));
    return counts.get(key)!;
};
X
git add -A && git commit -q -m "feat(cart): count the items with a cache"
git checkout -q main -- src/cart.ts
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
git add -A && git commit -q -m "refactor(cart): count the items directly"
git push -q -u origin feat/item-count
finish_shop
