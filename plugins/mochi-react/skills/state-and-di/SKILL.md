---
name: state-and-di
description: Where logic and state live in React apps of this stack — when a component's state moves into a co-located useX hook, effects only for external systems, async state as a status union, pending state from useTransition, context instead of prop drilling, context-based dependency injection for service clients, state-machine hook invariants, and casts only at untyped boundaries. Use when writing components, hooks, contexts, or code that talks to an external system.
user-invocable: false
paths:
  - "**/*.tsx"
  - "**/use*.ts"
  - "**/contexts/**"
  - "**/lib/**"
---

# State, Hooks and Dependency Injection

## Logic hooks

A component with real logic — effects, refs, derived data — moves it into a
co-located `useX.ts` and becomes mostly JSX. Presentational components get no
hook: add one when there is logic to extract, not by rote. A hook that owns
state outliving one component (for example persisted display preferences) is
called by the page that owns that lifetime.

The trigger is concrete: three or more `useState` calls, or any `useEffect`,
left in a `.tsx` component once the effect rules below are applied means the
logic belongs in its `useX.ts`.

## Effects are for external systems

An effect synchronizes with something outside React: a WebSocket, the Teams
SDK, a DOM API, a timer. Anything else is not an effect:

| Instead of an effect that… | Do |
|---|---|
| sets state computed from props or other state | compute it during render |
| resets state when a prop changes | have the parent pass that prop as `key` |
| reacts to a user action | run it in the event handler |
| tells the parent about a change | call `onChange` in the same handler |

```tsx
// ✗ mirrored state, one render behind
const [label, setLabel] = useState('');
useEffect(() => setLabel(`${first} ${last}`), [first, last]);

// ✓ derived during render
const label = `${first} ${last}`;
```

The `react-hooks` v7 `recommended` rules catch the first two rows. The
preset `${CLAUDE_PLUGIN_ROOT}/presets/eslint-mochi.mjs` turns them on.

## Async state

A request's lifecycle is one discriminated union on `status`, never
hand-written `useState` flags for `isLoading`, `error`, and `data` that can
contradict each other (a library hook such as `useQuery` already returns its
own `status`):

```ts
type AsyncState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: Error };
```

Switch on `status` with a `never` default, so a new state is a compile error
where it is not handled.

The pending state of a user action comes from React 19's `useTransition`, or
`useActionState` when the action returns a result to render — not from a
hand-written `isPending` `useState`. A React Hook Form submit uses
`formState.isSubmitting` instead (see the `forms` skill).

```tsx
const [isPending, startTransition] = useTransition();
const save = () =>
  startTransition(async () => {
    try {
      await transport.save(draft);
    } catch (failure) {
      setSaveFailure(failure);  // state typed unknown, as catch gives it
    }
  });
```

An error thrown inside a transition goes to the nearest error boundary and
replaces that part of the screen; catch it in the action unless that is the
intent. A caught value is `unknown`: keep it so, or narrow it with
`instanceof Error` before it enters an `AsyncState`.

## Shared state without prop drilling

A prop that passes through three or more components that only forward it moves
into a context beside its owner (`XProvider` + `useX()`, the shape the
clients below use), or the owner renders the consumer as `children`.

## Service clients through context

External-system clients (platform SDKs, HTTP/WebSocket transports) are read
from an injected instance:

```
lib/transport/          buildHttpTransport()          — the implementation
contexts/Transport/     TransportProvider + useTransport()  — the injection
App.tsx                 builds each client once and provides it
```

Hooks call `useTransport()` internally; clients are never threaded through
props or built inside a hook.

| Shape | Verdict |
|---|---|
| Props from App | Explicit, but threads clients through every layer |
| Module singleton | Ergonomic, but tests must `vi.mock` the module — global and hoisting-fragile |
| **Context DI** | Hook ergonomics plus explicit per-render injection; tests pass a fake to the real provider |

Accepted cost: `useX()` outside its provider throws. Re-render storms do not
apply because the client is a build-once, stable reference.

## State-machine hooks

- **One shared teardown path.** Every way out of a state (user action, server
  push) calls the same reset; extra steps are added around it, not copied.
- **One detector per transition.** Use a push *or* a poll for a given
  transition, scoped so two detectors never watch the same state.

## Casts

`as` only at untyped boundaries — the JSON wire response, a loosely typed
event — with a comment. Never to paper over a type you can model.
