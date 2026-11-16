#!/usr/bin/env bash
# Besides the repeated rule, refund.ts floors the refund, which shorts the customer.
set -euo pipefail
git init -q -b main
git config user.name eval && git config user.email eval@example.invalid
mkdir -p src/checkout
printf '# Shop\n\nA TypeScript checkout library. No build step; tests run with `node --test`.\n' > CLAUDE.md
for handler in cart invoice refund; do
cat > src/checkout/$handler.ts <<X
export const ${handler}Amount = (amount: number, isMember: boolean): number => {
    // Members get 5% off orders over 100.
    if (isMember && amount > 100) return Math.round(amount * 0.95 * 100) / 100;
    return amount;
};
X
done
cat > src/checkout/refund.ts <<'X'
export const refundAmount = (amount: number, isMember: boolean): number => {
    // Members get 5% off orders over 100.
    if (isMember && amount > 100) return Math.floor(amount * 0.95 * 100) / 100;
    return amount;
};
X
git add -A && git commit -q -m "feat: checkout handlers"
git remote add origin https://example.invalid/shop.git
git update-ref refs/remotes/origin/main main
git symbolic-ref refs/remotes/origin/HEAD refs/remotes/origin/main
