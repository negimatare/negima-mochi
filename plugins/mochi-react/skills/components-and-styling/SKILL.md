---
name: components-and-styling
description: Component folder shape, size, naming, and Griffel styling conventions for Fluent UI v9 apps — static data in *.constants.ts, when a subcomponent gets its own file, size lint as warnings, one makeStyles map per *.styles.ts, native CSS shorthands, sorted properties, design tokens, and which Fluent library patterns not to copy. Use when creating or editing components or style files.
user-invocable: false
paths:
  - "**/*.tsx"
  - "**/*.styles.ts"
---

# Components and Styling

## Component folder

```
StatusBadge/
  StatusBadge.tsx                  the component
  StatusBadge.types.ts             props + style-contract types (skip when propless)
  StatusBadge.constants.ts         static data (skip when there is none)
  useStatusBadgeStyles.styles.ts   the Griffel style hook
  StatusBadge.test.tsx             behaviour tests
  index.ts                         barrel
```

A folder nests sub-components under `components/` only when it really owns
several. Single-component folders stay flat.

## Component size

- **Static data** — an option list, lookup table, or config map of more than
  a few entries — moves out of the component into `X.constants.ts`, or into
  `lib/configs/` once two features use it. Keep its literal types:

  ```ts
  export const FONT_SIZES = [
    { value: 'small', px: 14 },
    { value: 'large', px: 18 },
  ] as const satisfies readonly FontSizeOption[];
  ```

- **A private subcomponent** with one user stays at the bottom of its
  parent's file, unexported. Once it needs its own state, its own `useX`
  hook, or passes about 40 lines, it gets its own folder beside the parent.
- **Size limits are warnings**, not errors, so the mochi-react lint-on-edit
  hook never blocks a cohesive file; reviews and `tidy` look for a seam past
  the limit. The limits are 200 non-blank, non-comment lines for a source
  file and a JSX depth of 6. The line limit replaces the 250-line default of
  `tidy`. Test files are exempt, one file per behaviour suite. The preset
  `${CLAUDE_PLUGIN_ROOT}/presets/eslint-mochi.mjs` holds this config. The
  depth limit counts through JSX held in variables, so hoisting a branch
  into a `const` does not hide it.

## Naming

- Components `PascalCase`; props `XProps`; style contract `XStyles`.
- Boolean props read as flags: `isContinuation`, `canSwap`. Callbacks must not
  collide with DOM events: `onFocusModeChange`, not `onFocusChange`.
- Exported constants `SCREAMING_CASE`.

## Griffel

```ts
const componentClassNames = { root: 'app-X', icon: 'app-X__icon' }; // DOM order

const useStyles = makeStyles({
  root: { ... },
  rootLive: { ... },   // variants are flat keys
});

export const useXStyles = (state): XStyles => {
  const styles = useStyles();
  return {
    root: mergeClasses(componentClassNames.root, styles.root, state.live && styles.rootLive),
  };
};
```

1. **One `useStyles` map per file**, not a hook per slot — Fluent's own
   dominant convention.
2. **Native CSS shorthands** (`border: '...'`), not the deprecated
   `shorthands.*` helpers. The preset's Griffel rule enforces this as a lint
   error on `*.styles.ts`. `@griffel/no-shorthands` contradicts it: in a
   config that sets it, say so and ask which rule to keep. Non-directional
   `borderWidth`/`overflow` shorthands are not typed — write `border: '0'`.
   A block needing an asymmetric border keeps per-side longhands with a
   comment saying why.
3. **Property order: logical groups, alphabetical within each** — layout, size,
   spacing, appearance, typography, motion. Lint-enforced where the project
   sets `perfectionist/sort-objects` on `*.styles.ts` (the mochi preset does
   not), for CSS rule bodies only:
   slot-name maps keep DOM order, and keyframe maps stay unsorted (sorting
   `from/to` breaks animations).
4. **Tokens over magic values**: `tokens.borderRadiusCircular`, not `999px`.
5. A comment explaining a property group goes above the rule key; the sort
   scatters per-property comments.

## Fluent patterns not to copy

These exist because Fluent ships a component library; app components do not
need them:

- `isConformant` tests and the slot / `_unstable` rendering contract — return a
  styles object instead of mutating `state.x.className`.
- `SlotClassNames<Slots>` typed maps.
- `import * as React` — the automatic JSX runtime makes it unnecessary.
