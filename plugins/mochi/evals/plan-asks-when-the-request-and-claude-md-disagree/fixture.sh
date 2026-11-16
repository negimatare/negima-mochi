#!/usr/bin/env bash
# The checkout handler fetches the tax rates itself and hands them to the
# domain, although CLAUDE.md says handlers stay thin and fetching lives in
# src/domain. The request asks to load the exchange rate "the same way the tax
# rates are loaded", so following it means breaking the CLAUDE.md rule.
set -euo pipefail
git init -q -b main
git config user.name eval && git config user.email eval@example.invalid
mkdir -p src/handlers src/domain src/clients
cat > CLAUDE.md <<'X'
# Checkout

A TypeScript checkout service. No build step; tests run with `node --test`.

## Layers

- `src/handlers/`: handlers stay thin. A handler parses the request, calls one
  function in `src/domain/`, and returns the response.
- `src/domain/`: every rule, and every call to another service through
  `src/clients/`.
- `src/clients/`: one module per outside service, with no rules.
X
cat > src/clients/rates.ts <<'X'
const RATES_URL = process.env.RATES_URL ?? "https://rates.example.invalid";

/** Tax rates by product category for a region, e.g. { books: 0.05 }. */
export const fetchTaxRates = async (region: string): Promise<Record<string, number>> =>
    (await fetch(`${RATES_URL}/tax/${region}`)).json();

/** How many units of `currency` one euro buys. */
export const fetchExchangeRate = async (currency: string): Promise<number> =>
    (await (await fetch(`${RATES_URL}/fx/EUR/${currency}`)).json()).rate;
X
cat > src/domain/invoice.ts <<'X'
export type Item = { category: string; price: number };

/** The invoice total in euros: each price plus its category's tax. */
export const invoiceTotal = (items: Item[], taxRates: Record<string, number>): number =>
    items.reduce((sum, item) => sum + item.price * (1 + (taxRates[item.category] ?? 0)), 0);
X
cat > src/handlers/checkout.ts <<'X'
import { fetchTaxRates } from "../clients/rates.ts";
import { invoiceTotal, type Item } from "../domain/invoice.ts";

type CheckoutRequest = { region: string; currency: string; items: Item[] };

export const checkout = async (request: CheckoutRequest): Promise<{ total: number }> => {
    const taxRates = await fetchTaxRates(request.region);
    return { total: invoiceTotal(request.items, taxRates) };
};
X
cat > src/domain/invoice.test.ts <<'X'
import { strictEqual } from "node:assert";
import { test } from "node:test";
import { invoiceTotal } from "./invoice.ts";

test("adds each category's tax", () => {
    strictEqual(invoiceTotal([{ category: "books", price: 100 }, { category: "food", price: 10 }], { books: 0.05 }), 115);
});
X
git add -A && git commit -q -m "feat: checkout total with tax"
git remote add origin https://example.invalid/checkout.git
git update-ref refs/remotes/origin/main main
git symbolic-ref refs/remotes/origin/HEAD refs/remotes/origin/main
