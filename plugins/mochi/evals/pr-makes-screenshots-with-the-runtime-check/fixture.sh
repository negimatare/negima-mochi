#!/usr/bin/env bash
# The cart-summary branch, with a Runtime check in CLAUDE.md on main and on
# the branch. Its stub driver writes a PNG and a log to $OUT, and logs each
# run to .eval/runtime-runs.log of this checkout, also from a copy of the
# tree: "items=1" when the tree holds the item count (the branch), "items=0"
# when it does not (the base), and "tree=copy" when it runs in a copy
# without .git, "tree=checkout" in this checkout.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/../_shared/cart-summary.sh"
git switch -q main
mkdir -p tools
# The stub logs to this checkout, by its path, from any copy of the tree.
{ echo "const CHECKOUT = $(node -p 'JSON.stringify(require("fs").realpathSync("."))');"; cat <<'Y'; } > tools/drive.mjs
// Renders the cart summary on a sample cart, with no server: a stub here.
import { appendFileSync, existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const out = resolve(process.argv[process.argv.indexOf("--out") + 1]);
mkdirSync(out, { recursive: true });
writeFileSync(join(out, "CartSummary.png"), Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
writeFileSync(join(out, "log.txt"), "screen: CartSummary -> CartSummary.png\n");
const items = readFileSync("src/CartSummary.tsx", "utf8").includes("Items:") ? 1 : 0;
const tree = existsSync(".git") ? (realpathSync(".") === CHECKOUT ? "checkout" : "other") : "copy";
appendFileSync(join(CHECKOUT, ".eval", "runtime-runs.log"), `items=${items} tree=${tree} out=${out}\n`);
console.log(`Done: ${out}`);
Y
cat >> CLAUDE.md <<'Y'

## Runtime check

Renders each component on a sample cart, with no server, and saves a
screenshot of each and a log to `$OUT`:

```bash
node tools/drive.mjs --out "$OUT"
```
Y
git add -A && git commit -q -m "chore: add the runtime check" && git push -q
git switch -q feat/item-count-summary
git rebase -q main
git push -q -f
finish_shop
