#!/usr/bin/env bash
# A clean repository on its default branch: nothing to diff.
set -euo pipefail
git init -q -b main
git config user.name eval && git config user.email eval@example.invalid
mkdir -p src
cat > src/cart.ts <<'TS'
export const total = (prices: number[]): number => prices.reduce((sum, p) => sum + p, 0);
TS
git add -A && git commit -q -m "feat: cart total"
git remote add origin https://example.invalid/shop.git
git update-ref refs/remotes/origin/main main
git symbolic-ref refs/remotes/origin/HEAD refs/remotes/origin/main
