#!/usr/bin/env bash
# One repo with two deployables: the checkout API in api/ and the web app in
# web/, which reads the API's `total` field. Nothing says how they deploy.
set -euo pipefail
git init -q -b main
git config user.name eval && git config user.email eval@example.invalid
mkdir -p api/src web/src
cat > CLAUDE.md <<'Y'
# Shop

The checkout API in `api/` and the web app in `web/`, both TypeScript. No
build step; tests run with `node --test` in each folder.
Y
echo '{ "name": "shop-api", "private": true, "type": "module" }' > api/package.json
echo '{ "name": "shop-web", "private": true, "type": "module" }' > web/package.json
cat > api/src/checkout.ts <<'Y'
/** The checkout response: the cart total in euros. */
export const checkout = (prices: number[]): { total: number } => ({
    total: prices.reduce((sum, price) => sum + price, 0),
});
Y
cat > api/src/checkout.test.ts <<'Y'
import { strictEqual } from "node:assert";
import { test } from "node:test";
import { checkout } from "./checkout.ts";

test("sums the prices", () => strictEqual(checkout([10, 9.99]).total, 19.99));
Y
cat > web/src/checkoutView.ts <<'Y'
/** The total line of the checkout page, from the API response. */
export const totalLine = (response: { total: number }): string => `Total: ${response.total.toFixed(2)}`;
Y
git add -A && git commit -q -m "feat: checkout total"
git remote add origin https://example.invalid/shop.git
git update-ref refs/remotes/origin/main main
git symbolic-ref refs/remotes/origin/HEAD refs/remotes/origin/main
