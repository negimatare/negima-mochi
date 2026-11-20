#!/usr/bin/env bash
# A JavaScript app whose pull_request workflow runs the tests, a link check
# that only CI runs (it is not a package script), and a preview deploy with a
# secret.
set -euo pipefail
git init -q -b main
git config user.name eval && git config user.email eval@example.invalid
cat > package.json <<'Y'
{ "name": "orders", "private": true, "type": "module", "scripts": { "test": "node --test" } }
Y
source "$(dirname "${BASH_SOURCE[0]}")/../_shared/npmrc.sh"
mkdir -p src scripts docs .github/workflows
cat > scripts/check-links.mjs <<'Y'
// Fails when a relative link in docs/ points to a file that does not exist.
import { existsSync, readdirSync, readFileSync } from "node:fs";

const broken = readdirSync("docs").flatMap((f) =>
    [...readFileSync(`docs/${f}`, "utf8").matchAll(/\]\((\.[^)]+)\)/g)].map((m) => m[1]).filter((l) => !existsSync(`docs/${l}`)));
if (broken.length) { console.error(`broken links: ${broken.join(", ")}`); process.exit(1); }
Y
cat > scripts/deploy-preview.sh <<'Y'
#!/usr/bin/env bash
# Uploads the app to the preview host. Needs PREVIEW_TOKEN.
set -euo pipefail
curl -fsS -H "Authorization: Bearer $PREVIEW_TOKEN" --data-binary @src/total.js https://preview.example.invalid/upload
Y
chmod +x scripts/deploy-preview.sh
printf '# Orders\n\nSee [the total](./total.md).\n' > docs/index.md
printf '# Total\n\nThe sum of the prices.\n' > docs/total.md
cat > src/total.js <<'Y'
export const total = (prices) => prices.reduce((sum, p) => sum + p, 0);
Y
cat > src/total.test.js <<'Y'
import { strictEqual } from "node:assert";
import { test } from "node:test";
import { total } from "./total.js";

test("sums the prices", () => strictEqual(total([1, 2]), 3));
Y
cat > .github/workflows/ci.yml <<'Y'
name: CI
on:
  pull_request:
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - run: npm ci
      - run: npm test
  docs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: node scripts/check-links.mjs
  preview:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: ./scripts/deploy-preview.sh
        env:
          PREVIEW_TOKEN: ${{ secrets.PREVIEW_TOKEN }}
Y
git add -A && git commit -q -m "feat: orders"
