# Sourced by fixture.sh: the shop-lib.sh repository with a local
# feat/item-count branch that is not pushed. The CLAUDE.md asks for an API
# docs check before a push to an open PR, and that check fails: the branch
# adds an export that docs/api.md does not list. The case calls finish_shop
# after its own additions.
source "$(dirname "${BASH_SOURCE[0]}")/shop-lib.sh"
cat >> CLAUDE.md <<'Y'

## Before a push to an open PR

The `pull_request` CI jobs that Verification does not run:

```bash
npm run check:api-docs   # CI job "docs": each export of src/ has an entry in docs/api.md
```
Y
cat > package.json <<'Y'
{ "name": "shop", "private": true, "type": "module", "scripts": { "test": "bash scripts/test.sh", "check:api-docs": "node scripts/check-api-docs.mjs" } }
Y
cat > scripts/check-api-docs.mjs <<'Y'
// Fails when an export of src/ has no "## <name>" entry in docs/api.md.
import { readdirSync, readFileSync } from "node:fs";

const docs = readFileSync("docs/api.md", "utf8");
const missing = readdirSync("src")
    .filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"))
    .flatMap((f) => [...readFileSync(`src/${f}`, "utf8").matchAll(/export const (\w+)/g)].map((m) => m[1]))
    .filter((name) => !docs.includes(`## ${name}`));
if (missing.length) { console.error(`not in docs/api.md: ${missing.join(", ")}`); process.exit(1); }
Y
mkdir -p docs
printf '# API\n\n## total\n\nThe sum of the item prices.\n' > docs/api.md
git add -A && git commit -q -m "ci: check the API docs"
git push -q origin main
git switch -q --no-track -c feat/item-count
cat >> src/cart.ts <<'Y'

/** How many items the cart holds. */
export const itemCount = (prices: number[]): number => prices.length;
Y
cat >> src/cart.test.ts <<'Y'

test("counts the items", async () => {
    const { itemCount } = await import("./cart.ts");
    strictEqual(itemCount([5, 5, 5]), 3);
});
Y
git add -A && git commit -q -m "feat(cart): count the items"
