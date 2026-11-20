#!/usr/bin/env bash
# A React + Fluent package whose ESLint config lacks the size rules. Its lint
# script runs offline: it reads `max-lines` from eslint.config.js and warns or
# fails on source files past it, like ESLint would.
set -euo pipefail
git init -q -b main
git config user.name eval && git config user.email eval@example.invalid
mkdir -p src scripts
cat > package.json <<'P'
{
  "name": "orders-web",
  "private": true,
  "type": "module",
  "scripts": { "lint": "node scripts/lint.mjs" },
  "dependencies": { "@fluentui/react-components": "^9.66.0", "react": "^19.1.0", "react-dom": "^19.1.0" }
}
P
source "$(dirname "${BASH_SOURCE[0]}")/../_shared/npmrc.sh"
cat > eslint.config.js <<'P'
export default [
    {
        files: ['src/**/*.{ts,tsx}'],
        rules: {
            'react/jsx-key': 'error',
        },
    },
];
P
cat > scripts/lint.mjs <<'P'
import { readdirSync, readFileSync } from "node:fs";
import config from "../eslint.config.js";

let failed = false;
for (const file of readdirSync("src").filter((f) => /\.tsx?$/.test(f) && !f.includes(".test."))) {
    const rule = config.filter((c) => !c.files?.some((g) => g.includes(".test."))).map((c) => c.rules?.["max-lines"]).filter(Boolean).at(-1);
    if (!rule) continue;
    const [level, { max }] = rule;
    const lines = readFileSync(`src/${file}`, "utf8").split("\n").filter((l) => l.trim()).length;
    if (lines > max) {
        console.log(`src/${file}: ${level} File has too many lines (${lines}). Maximum allowed is ${max}  max-lines`);
        failed ||= level === "error";
    }
}
process.exit(failed ? 1 : 0);
P
{
    echo "export const OrderList = () => ("
    echo "    <ul>"
    for i in $(seq 1 230); do echo "        <li key=\"$i\">Order $i</li>"; done
    echo "    </ul>"
    echo ");"
} > src/OrderList.tsx
git add -A && git commit -q -m "feat: order list"
