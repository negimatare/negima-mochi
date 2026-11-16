#!/usr/bin/env bash
# The orders app with a design-token file, so a change inside the header
# alone has screens to show and no data flow to draw.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/../_shared/orders-app.sh"
mkdir -p src/api src/styles
cat > package.json <<'X'
{ "name": "orders", "private": true, "dependencies": { "react": "^19.0.0", "react-dom": "^19.0.0" } }
X
cat > CLAUDE.md <<'X'
# Orders

A React app built by Vite. Styles use the tokens in src/styles/tokens.css.
X
cat > src/styles/tokens.css <<'X'
:root {
    --color-brand: #0f6cbd;
    --color-text: #242424;
    --color-border: #d1d1d1;
    --radius-medium: 4px;
    --font-base: "Segoe UI", sans-serif;
}
X
cat > src/components/Header.css <<'X'
.header { display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-bottom: 1px solid var(--color-border); font-family: var(--font-base); }
.header__title { flex: 1; margin: 0; font-size: 20px; color: var(--color-text); }
.button { border: 1px solid var(--color-border); border-radius: var(--radius-medium); padding: 6px 12px; background: #fff; }
.button--primary { background: var(--color-brand); border-color: var(--color-brand); color: #fff; }
X
cat > src/components/Header.tsx <<'X'
import "./Header.css";
import { formatDate } from "../lib/format";

export const Header = () => (
    <header className="header">
        <h1 className="header__title">Orders on {formatDate(new Date())}</h1>
        <button className="button">Refresh</button>
    </header>
);
X
cat > src/api/orders.ts <<'X'
const BASE = "/api";

export const getOrders = async (): Promise<unknown[]> => (await fetch(`${BASE}/orders`)).json();
X
cat > src/lib/format.ts <<'X'
export const formatDate = (date: Date): string => date.toISOString().slice(0, 10);
X
cat > src/main.tsx <<'X'
import { createRoot } from "react-dom/client";
import "./styles/tokens.css";
import { Header } from "./components/Header";

createRoot(document.getElementById("root")!).render(<Header />);
X
git add -A && git commit -q -m "feat: orders app"
git remote add origin https://example.invalid/orders.git
git update-ref refs/remotes/origin/main main
git symbolic-ref refs/remotes/origin/HEAD refs/remotes/origin/main

# The graders read the file the model writes, named with today's date, through .eval/.
d=$(date +%Y%m%d) && mkdir -p .eval && echo '.eval/' >> .git/info/exclude
ln -s "../.plans/$d-help-link.html" .eval/plan.html
ln -s "../.plans/$d-help-link.view.json" .eval/plan.view.json
