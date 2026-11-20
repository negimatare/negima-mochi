#!/usr/bin/env bash
# The orders app with a Dead-code check. The stub prints what knip would
# without guest.html in its config: GuestPage is a false positive, and
# left-pad is an unused dependency only the tool reports.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/../_shared/orders-app.sh"
mkdir -p scripts
cat > scripts/knip.mjs <<'X'
console.log(`Unused files (2)
src/components/Banner.tsx
src/pages/GuestPage.tsx
Unused dependencies (1)
left-pad  package.json
Unused exports (1)
formatLegacyDate  src/lib/format.ts:3:14`);
process.exit(1);
X
cat > package.json <<'X'
{ "name": "orders", "private": true, "scripts": { "knip": "node scripts/knip.mjs" }, "dependencies": { "left-pad": "^1.3.0", "react": "^19.0.0", "react-dom": "^19.0.0" } }
X
source "$(dirname "${BASH_SOURCE[0]}")/../_shared/npmrc.sh"
cat > CLAUDE.md <<'X'
# Orders

A React app with two entry pages, index.html and guest.html, built by Vite.

## Dead-code check

Run from this folder by reviews and audits, not part of verification.

```bash
npm run knip
```
X
git add -A && git commit -q -m "feat: orders app"
