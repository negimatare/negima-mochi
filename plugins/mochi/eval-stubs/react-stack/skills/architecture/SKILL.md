---
name: architecture
description: Layering rules for React apps in this stack — feature slices, public-API barrels, and lint-enforced dependency direction. Use when adding, moving, or importing modules under src/.
user-invocable: false
---

# Architecture

- **Slices never import each other.** The page composes them and passes data
  down.
- **Consumers import from the barrel**, never from a layer's internals.

The layering is a lint error to violate. The preset
`${CLAUDE_PLUGIN_ROOT}/presets/eslint-mochi.mjs` holds the layers, the
`react-hooks` `recommended` rules, the size warnings and the Griffel
shorthand rule. `/mochi:setup-project` copies it beside the package's ESLint
config.
