#!/usr/bin/env bash
# The orders app with no dead-code tool: the reviewer must sweep.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/../_shared/orders-app.sh"
cat > package.json <<'X'
{ "name": "orders", "private": true, "dependencies": { "react": "^19.0.0", "react-dom": "^19.0.0" } }
X
cat > CLAUDE.md <<'X'
# Orders

A React app with two entry pages, index.html and guest.html, built by Vite.
X
git add -A && git commit -q -m "feat: orders app"
