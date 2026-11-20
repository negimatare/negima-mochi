#!/usr/bin/env bash
# A pushed feat/item-count-summary branch that changes the markup of the cart
# summary component: it adds a line with the item count.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/../_shared/shop-lib.sh"
cat > src/CartSummary.tsx <<'Y'
import { total } from "./cart.ts";

/** The summary that checkout shows under the item list. */
export const CartSummary = ({ prices }: { prices: number[] }) => (
    <section className="cart-summary">
        <p>Total: {total(prices)}</p>
    </section>
);
Y
git add -A && git commit -q -m "feat: cart summary" && git push -q
git switch -q --no-track -c feat/item-count-summary
cat > src/CartSummary.tsx <<'Y'
import { total } from "./cart.ts";

/** The summary that checkout shows under the item list. */
export const CartSummary = ({ prices }: { prices: number[] }) => (
    <section className="cart-summary">
        <p>Items: {prices.length}</p>
        <p>Total: {total(prices)}</p>
    </section>
);
Y
git add -A && git commit -q -m "feat(cart): show the item count in the cart summary" -m "Customers ask support how many items their cart holds."
git push -q -u origin feat/item-count-summary
finish_shop
