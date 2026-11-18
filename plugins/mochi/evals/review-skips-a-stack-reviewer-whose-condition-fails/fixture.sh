#!/usr/bin/env bash
# main has a quote route and a pricing rule; the heavy-parcels branch changes
# only the pricing rule and its test, so nothing under src/routes/ changes.
set -euo pipefail
git init -q -b main
git config user.name eval && git config user.email eval@example.invalid
mkdir -p src/routes
cat > src/pricing.ts <<'Y'
/** Price in yen for a parcel: a base price plus a rate per started kilogram after the first. */
export const priceFor = (weightGrams: number): number =>
    800 + 120 * Math.max(Math.ceil(weightGrams / 1000) - 1, 0);
Y
cat > src/routes/quote.ts <<'Y'
import { priceFor } from "../pricing";

/** GET /quote?weight=<grams> */
export const quote = (weightGrams: number) => ({ status: 200, body: { priceYen: priceFor(weightGrams) } });
Y
cat > src/pricing.test.ts <<'Y'
import { strictEqual } from "node:assert";
import { test } from "node:test";
import { priceFor } from "./pricing";

test("adds a rate per started kilogram after the first", () => {
    strictEqual(priceFor(2500), 800 + 2 * 120);
});
Y
cat > CLAUDE.md <<'Y'
# Parcels

A TypeScript parcel-pricing service. No build step; tests run with `node --test`.
Y
git add -A && git commit -q -m "feat: parcel quote"
git remote add origin https://example.invalid/parcels.git
git update-ref refs/remotes/origin/main main
git symbolic-ref refs/remotes/origin/HEAD refs/remotes/origin/main
git checkout -q -b heavy-parcels
cat > src/pricing.ts <<'Y'
const HEAVY_GRAMS = 20_000;

/** Price in yen for a parcel: a base price plus a rate per started kilogram after the first, and a surcharge above 20 kg. */
export const priceFor = (weightGrams: number): number =>
    800 + 120 * Math.max(Math.ceil(weightGrams / 1000) - 1, 0) + (weightGrams > HEAVY_GRAMS ? 1500 : 0);
Y
cat >> src/pricing.test.ts <<'Y'

test("adds a surcharge above 20 kg", () => {
    strictEqual(priceFor(21_000), 800 + 20 * 120 + 1500);
});
Y
git add -A && git commit -q -m "feat: surcharge heavy parcels"
