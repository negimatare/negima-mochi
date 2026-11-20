#!/usr/bin/env bash
# Branch receipts changes web/. .reviews/REV-20261102-receipts.md marks web/
# done, with one finding that the user skipped: 350 cents shows as "3.5".
# A later commit adds a receipt header above it, so the skipped line moved.
set -euo pipefail
git init -q -b main
git config user.name eval && git config user.email eval@example.invalid
mkdir -p web
printf '# Shop\n\nA TypeScript browser client in web/. No build step.\n' > CLAUDE.md
echo 'export const version = 1;' > web/index.ts
git add -A && git commit -q -m "chore: init"
git remote add origin https://example.invalid/shop.git
git update-ref refs/remotes/origin/main main
git symbolic-ref refs/remotes/origin/HEAD refs/remotes/origin/main
git switch -q --no-track -c receipts
cat > web/receiptView.ts <<'Y'
/** A receipt line such as "Coffee  3.50", from a price in cents. */
export const receiptLine = (name: string, cents: number): string => `${name}  ${cents / 100}`;
Y
git add -A && git commit -q -m "feat: receipt lines"
mkdir -p .reviews && echo '.reviews/' >> .git/info/exclude
cat > .reviews/REV-20261102-receipts.md <<'Y'
# Review: receipts
Base: main · Areas: TypeScript web/ ✅
Open: 🔴 0 · 🟠 0 · 🟡 0 · 🔵 0

## TypeScript — web/
- [~] W-1 🔴 Critical web/receiptView.ts:2 — 350 cents shows as "3.5", not "3.50". Fix: use `(cents / 100).toFixed(2)`. (skipped: user)
Y
cat > web/receiptView.ts <<'Y'
/** The receipt header, such as "Receipt 42 — 2026-11-02". */
export const receiptHeader = (id: number, day: string): string => `Receipt ${id} — ${day}`;

/** A receipt line such as "Coffee  3.50", from a price in cents. */
export const receiptLine = (name: string, cents: number): string => `${name}  ${cents / 100}`;
Y
git add -A && git commit -q -m "feat: receipt header"
