#!/usr/bin/env bash
# The shop integrates on develop: CLAUDE.md names it, while origin/HEAD is
# still main, which holds releases. An uncommitted itemCount function on
# develop, to be committed, pushed and drafted as a pull request.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/../_shared/shop-lib.sh"
git switch -q -c develop
cat >> CLAUDE.md <<'X'

Integration branch: `develop`
X
git add -A && git commit -q -m "docs: name the integration branch"
git push -q -u origin develop
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
