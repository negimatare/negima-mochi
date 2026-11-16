---
name: performance
description: Rendering performance conventions for React apps in this stack — when hand-written memoization is allowed with and without React Compiler, lazy-loading heavy screens that keep named exports, and virtualizing long lists with TanStack Virtual. Use when writing components, hooks, or lists that can grow long.
user-invocable: false
paths:
  - "**/*.tsx"
  - "**/use*.ts"
---

# Performance

## Memoization

First check whether the project builds with React Compiler:
`babel-plugin-react-compiler` in its dev dependencies, wired in the Vite or
Babel config. React 19 does not enable it by itself.

- **With the compiler**: no new `useMemo`, `useCallback`, or `memo`; the
  compiler memoizes. Existing ones can stay until their file is next
  refactored. When `exhaustive-deps` flags a function an effect depends on,
  move the function into the effect or read it through `useEffectEvent`;
  keep a `useCallback` only where it must hold an effect's dependencies
  steady. Under the compiler's `compilationMode: 'annotation'`, only
  components marked `'use memo'` are compiled; the others follow the next
  rule.
- **Without it**: memoize only where identity matters — a value an effect
  or another hook depends on, a context provider's `value`, a prop of a
  component wrapped in `memo` — or a calculation measured as slow. Never
  "just in case".

## Lazy screens

A screen or panel only some sessions open (settings, admin, a heavy chart)
loads with `lazy`, under a `Suspense` whose fallback is a Fluent `Spinner`.
`lazy` needs a default export; keep the named export and adapt it:

```tsx
const SettingsPanel = lazy(() =>
  import('./SettingsPanel').then((module) => ({ default: module.SettingsPanel })),
);
```

`lazy` is called at module top level, never inside a component, which would
reset the screen's state on every render.

## Long lists

A list that can grow past a few hundred rows renders through
`useVirtualizer` from `@tanstack/react-virtual` (adding it follows the
`dependencies` skill):

```tsx
const virtualizer = useVirtualizer({
  count: rows.length,
  getScrollElement: () => scrollRef.current,
  estimateSize: () => 48,
});
```

- The scroll element has a fixed height. Rows of varying height pass
  `ref={virtualizer.measureElement}` and `data-index={item.index}`.
- Row offsets are runtime values, so they go in an inline `style`; static
  styling stays in the Griffel map.
- A list that already windows itself, such as a transcript keeping only its
  latest rows, does not get a second virtualizer.
