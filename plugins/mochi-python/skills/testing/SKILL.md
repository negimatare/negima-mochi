---
name: testing
description: pytest conventions for FastAPI services in this stack, after Cosmic Python — most tests at the handler with fakes, domain tests for rich rules, a few API tests per slice through dependency overrides, adapter tests against a real database, fakes over mock.patch, an injected clock instead of sleeping, fixtures with yield and the right scope, parametrize only for distinct behaviours, test names that state the behaviour, and the OpenAPI spec test. Use when writing or changing tests, fixtures, or fakes.
user-invocable: false
paths:
  - "**/test_*.py"
  - "**/*_test.py"
  - "**/conftest.py"
  - "**/tests/**/*.py"
---

# Testing

## Where each test goes

Test each behaviour once, at the cheapest level that proves it:

| Level | Proves | Uses |
|---|---|---|
| **Handler** (most tests) | a use case: what it saves, raises, and publishes | the real handler and domain, a `FakeUnitOfWork`, a fixed clock |
| **Domain** | a rich rule with many cases | the aggregate or rule alone, no fakes |
| **API** (a few per slice) | the transport: status, schema, problem body, headers | the app from `create_app()`, handlers' dependencies overridden |
| **Adapter** | a repository, a query slice, the unit of work, a migration | a real database of the production engine, never SQLite standing in for Postgres |

An API test does not re-prove the rules the handler tests cover: one happy
path and the mapping of each error status is enough.

Tests mirror the package: `tests/shipping/test_dispatch_shipment.py` holds
that slice's handler and API tests. Adapter tests that need a database sit in
`tests/integration/`, so a run without one can skip them by folder or marker.

## Fakes, not mocks

A fake implements the `Protocol` the code depends on, in memory:

```python
class FakeShippingUnitOfWork:
    def __init__(self, shipments: Iterable[Shipment] = ()) -> None:
        self.shipments = FakeShipmentRepository(shipments)
        self.committed = False
        self.published: list[object] = []

    async def __aenter__(self) -> Self:
        return self

    async def __aexit__(self, *exc_info: object) -> None:
        pass

    async def commit(self) -> None:
        self.committed = True
        self.published.extend(self.shipments.collect_events())
```

- Assert outcomes: what the fake holds, `committed`, the events published,
  the exception raised. Never which methods were called in what order.
- `mock.patch` is for code you neither own nor inject. Never patch your own
  modules: inject the dependency instead.
- API tests replace a provider: `app.dependency_overrides[get_shipping_uow] =
  lambda: uow`, cleared in the fixture's teardown. Use the async test client
  the project already uses, through the app's lifespan.

## Fixtures

- A fixture with cleanup yields: setup, `yield value`, teardown.
- Scope by cost: `function` by default; `module` for expensive setup no test
  mutates; `session` for a database engine or a container. A
  wider scope never holds state a test changes.
- A fixture or fake moves into a `conftest.py` (or `tests/fakes.py`) when a
  second test file needs it, into the nearest folder both share.

## Time

Code that reads the time takes a clock (see the `service-layer` skill), and
tests pass a fixed one. No `time.sleep`, no `asyncio.sleep` to wait for
background work, no real-time timeouts. An event handler's effect is awaited
through the fake unit of work, not polled.

## Parametrize

Only for distinct behaviours, with an `id` each:

```python
@pytest.mark.parametrize("state", [
    pytest.param(dispatched(), id="dispatched"),
    pytest.param(delivered(), id="delivered"),
])
def test_cancel_raises_when_shipment_has_left(state: ShipmentState) -> None: ...
```

Two inputs that take the same branch are one test, not two rows.

## Naming and assertions

- `test_<action>_<outcome>_when_<condition>`, in the business's words:
  `test_dispatch_raises_when_shipment_already_dispatched`.
- Plain `assert`; `pytest.raises(ShipmentAlreadyDispatched)` with the domain
  exception, never a bare `Exception` or a message match alone.
- An API error test asserts the status, `application/problem+json`, and the
  problem's `type`.
- The one snapshot is the OpenAPI spec test from the `openapi` skill.
- A flaky test is fixed or deleted the day it flakes. Suspect the assertion or
  a shared fixture before the timing.

## Coverage

When the project measures coverage, generated clients and migrations are
excluded. A coverage percentage is not a goal: one test per behaviour is.
