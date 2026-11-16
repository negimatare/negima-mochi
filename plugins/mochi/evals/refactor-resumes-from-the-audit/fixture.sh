#!/usr/bin/env bash
# src/checkout already has an audit file with one open and one done candidate.
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
git add -A && git commit -q -m "feat: checkout handlers"
git remote add origin https://example.invalid/shop.git
git update-ref refs/remotes/origin/main main
git symbolic-ref refs/remotes/origin/HEAD refs/remotes/origin/main
mkdir -p .reviews && echo '.reviews/' >> .git/info/exclude
base=$(git rev-parse --short HEAD)
cat > .reviews/REF-20261102-src-checkout.md <<X
# Refactor audit: src/checkout
Base: $base · Goal: every change to the member discount breaks one of the handlers
Open: 🔴 0 · 🟠 1 · 🟡 0 · 🔵 0

## Candidates
- [ ] R-1 🟠 High · M    The member discount rule lives in three handlers — each pricing change edits all three. Files: src/checkout/{cart,invoice,refund}.ts. Pinning: none.
- [x] R-2 🟡 Medium · S  Handler names repeat the folder name. Files: src/checkout/*.ts. Pinning: covered.
X
