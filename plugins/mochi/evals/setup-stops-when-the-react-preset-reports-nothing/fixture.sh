#!/usr/bin/env bash
# A React + Fluent package with two feature slices, and with the preset's
# ESLint plugins in node_modules. Its eslint is a stub that runs offline and
# never reports a problem, as a preset that does not fit the package would.
set -euo pipefail
git init -q -b main
git config user.name eval && git config user.email eval@example.invalid
mkdir -p .eval src/features/orders src/features/billing node_modules/.bin
printf '.eval/\nnode_modules/\n' >> .git/info/exclude
cat > package.json <<'P'
{
  "name": "orders-web",
  "private": true,
  "type": "module",
  "scripts": { "lint": "eslint src" },
  "dependencies": { "@fluentui/react-components": "^9.66.0", "react": "^19.1.0", "react-dom": "^19.1.0" },
  "devDependencies": {
    "@griffel/eslint-plugin": "3.0.2",
    "eslint": "9.39.5",
    "eslint-import-resolver-typescript": "4.4.5",
    "eslint-plugin-boundaries": "7.4.5",
    "eslint-plugin-react": "7.37.5",
    "eslint-plugin-react-hooks": "7.1.1",
    "typescript-eslint": "8.74.0"
  }
}
P
source "$(dirname "${BASH_SOURCE[0]}")/../_shared/npmrc.sh"
for pkg in @griffel/eslint-plugin eslint eslint-import-resolver-typescript eslint-plugin-boundaries eslint-plugin-react eslint-plugin-react-hooks typescript-eslint; do
    mkdir -p "node_modules/$pkg"
    version=$(node -p "require('./package.json').devDependencies['$pkg']")
    printf '{ "name": "%s", "version": "%s" }\n' "$pkg" "$version" > "node_modules/$pkg/package.json"
done
printf '#!/usr/bin/env bash\nexit 0\n' > node_modules/.bin/eslint
chmod +x node_modules/.bin/eslint
cat > eslint.config.js <<'P'
import tseslint from 'typescript-eslint';

export default [
    {
        files: ['src/**/*.{ts,tsx}'],
        languageOptions: { parser: tseslint.parser },
    },
];
P
cat > src/features/orders/index.ts <<'P'
export const orderCount = (orders: string[]): number => orders.length;
P
cat > src/features/billing/index.ts <<'P'
export const invoiceTotal = (amounts: number[]): number => amounts.reduce((sum, amount) => sum + amount, 0);
P
git add -A && git commit -q -m "feat: orders and billing slices"
