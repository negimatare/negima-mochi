---
name: architecture
description: Layering rules for React apps in this stack — feature slices, public-API barrels, what belongs in common/ and lib/, one path alias per layer, and lint-enforced dependency direction. Use when adding, moving, or importing modules under src/.
user-invocable: false
paths:
  - "**/src/**/*.ts"
  - "**/src/**/*.tsx"
---

# Architecture

A pragmatic subset of Feature-Sliced Design: vertical slices, public-API
barrels, one-way dependencies — without the full seven-layer taxonomy a small
app does not need.

## Layout

```
src/
  App.tsx, main.tsx   app entry
  pages/              route-level compositions of features
  features/<name>/    vertical slices by business domain
  common/             feature-agnostic primitives with 2+ real consumers
  contexts/           React-context injection of service clients
  lib/                cross-cutting kernel: configs, external-system clients, providers
  test/               test-only shared fixtures (never imported by production code)
```

A feature slice:

```
features/<name>/
  index.ts       public API — the only entry point
  components/    each component in its own folder
  hooks/         the feature's logic
  domain/        domain model and pure transforms
```

## Rules

- **Slices never import each other.** The page composes them and passes data
  between them.
- **Consumers import from the barrel**, never from a layer's internals. A
  feature's public `index.ts` exposes only its curated surface; internal-only
  parts are re-exported from an internal barrel.
- **`common/` earns entries on the second consumer.** A component used by one
  feature stays in that feature, however generic it feels.
- **`lib/` is the bottom layer.** It depends on nothing above it. Client
  *implementations* live in `lib/`; their React injection lives in `contexts/`.
- **Name boundaries by capability** (`teams`, `transport`), not by pattern
  (`adapters/`, `ports/`).

## Path aliases

One alias per layer (`@<app>/common`, `@<app>/features`, …), keys kept in
alphabetical order. Every alias is defined in `tsconfig.app.json`,
`vite.config.ts`, and `vitest.config.ts`, and the three must stay in sync —
except the test alias, which is absent from `vite.config.ts` so the production
bundle can never import test code.

## Enforced dependency direction

The layering is a lint error to violate. Typical allowed edges:

```
app       -> app, pages, features, common, contexts, lib, test
pages     -> features, common, contexts, lib, test
features  -> features (own slice only), common, contexts, lib, test
contexts  -> contexts, lib, test
common    -> common, lib, test
lib       -> lib, test
test      -> any layer
```

When adding a layer, add its element pattern and its allowed edges, then prove
the guard with a deliberate violation — a guard that passes vacuously is
worthless.

The preset `${CLAUDE_PLUGIN_ROOT}/presets/eslint-mochi.mjs` holds these
layers, the `react-hooks` `recommended` rules, the size warnings and the
Griffel shorthand rule. `/mochi:setup-project` copies it beside the package's
ESLint config.
