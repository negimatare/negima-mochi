---
name: testing
description: Vitest + React Testing Library conventions for this stack — behaviour tests over snapshots, query priority, jest-dom assertions, injecting doubles through real providers, shared fixtures on the second consumer, fake timers, and test naming. Use when writing or changing tests.
user-invocable: false
paths:
  - "**/*.test.ts"
  - "**/*.test.tsx"
  - "**/src/test/**"
---

# Testing

Tests sit beside the code (`X.test.tsx`); setup lives in `src/test/setup.ts`,
wired through `vitest.config.ts`.

## Behaviour, not snapshots

Shape: `describe` + behaviour-named `it`, `render`, `userEvent`, `vi.fn()`
spies, jest-dom assertions. No snapshot-as-primary — a snapshot asserts "same
bytes", not "correct", and gets regenerated blindly. No `isConformant`.

## Queries

1. `getByRole` / `getByText` / `getByAltText` — what a user or assistive
   technology perceives.
2. `data-testid` — only when no semantic handle exists. A testid is a
   cross-component contract: check who queries it before removing it.

Content that renders after a loading state needs `await findBy*`, not a
synchronous `getBy*`. Anchor exact-name queries (`/^Multi$/` does not match
"Multi Speaker (Auto)").

## Assertions

`toBeInTheDocument()` / `not.toBeInTheDocument()`. Never `toBeTruthy()` after a
`getBy*` (it already threw) and prefer `not.toBeInTheDocument()` over
`toBeNull()`.

## Doubles through providers

Inject fakes through the real providers, never `vi.mock` a client module:

```tsx
function renderPanel(transport = buildTransport(), props = {}) {
  return render(
    <TransportProvider client={transport.client}>
      <Panel {...props} />
    </TransportProvider>,
  );
}
```

A `buildX()` factory returns the fake plus its spies and a rig to push events
(capture the subscriber, expose `emit`). `rerender` must re-wrap in the
providers.

## Shared fixtures

Test-only factories live in `src/test/` (with its own barrel, imported through
the test alias). A helper moves there only when a **second test file** needs
it; heavy reuse inside one file is not a second consumer.

## Time

Anything waiting on an interval or timeout uses
`vi.useFakeTimers({ shouldAdvanceTime: true })` and
`vi.advanceTimersByTimeAsync`, never a real-time `waitFor({ timeout })`.

## Naming

`it("does <observable behaviour> when <condition>")`, using the product's
current wording. When a test "flakes", suspect the assertion before timing.
