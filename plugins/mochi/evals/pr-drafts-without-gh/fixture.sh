#!/usr/bin/env bash
# A pushed feature branch with one commit; gh is not logged in during eval runs.
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
git add -A && git commit -q -m "feat(cart): count the items" -m "Support quotes item counts to customers."
git push -q -u origin feat/item-count
finish_shop
