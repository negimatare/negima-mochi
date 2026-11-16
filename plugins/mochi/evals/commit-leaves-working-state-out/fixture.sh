#!/usr/bin/env bash
# An uncommitted itemCount change next to an untracked plan and scratch file.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/../_shared/shop-lib.sh"
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
mkdir -p .plans
echo '# Item count' > .plans/20261102-item-count.md
echo 'try itemCount([])' > scratch.txt
finish_shop
