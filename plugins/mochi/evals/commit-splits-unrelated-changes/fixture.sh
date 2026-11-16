#!/usr/bin/env bash
# Two unrelated uncommitted changes: a README typo fix and a new itemCount function with its test.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/../_shared/shop-lib.sh"
echo 'A TypeScript cart libary.' > README.md
echo "MIT" > LICENSE
git add README.md LICENSE && git commit -q -m "docs: add a README and a license" && git push -q
echo 'A TypeScript cart library.' > README.md
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
finish_shop
