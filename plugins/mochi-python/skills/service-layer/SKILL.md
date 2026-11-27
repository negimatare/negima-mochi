---
name: service-layer
description: Use-case conventions for FastAPI services in this stack, after Cosmic Python — a slice's handler as one function that takes a command and its dependencies, the unit of work as the only place a write commits, domain events published in-process after commit to event-triggered slices, query slices that read directly (CQRS), dependency injection through one composition root and FastAPI Depends, settings read once, an injected clock, and async code that never blocks. Use when writing handlers, the unit of work, bootstrap.py, dependencies, or code that talks to an external system.
user-invocable: false
paths:
  - "**/handler.py"
  - "**/endpoint.py"
  - "**/bootstrap.py"
  - "**/main.py"
  - "**/adapters/**/*.py"
  - "**/shared/**/*.py"
---

# Service layer and dependency injection

## A slice's handler

The handler is the use case: one function, named after the intent. It takes a
**command** (a frozen dataclass defined beside it) and its dependencies as
parameters, never the request schema, so the same use case runs from an
endpoint, an event, a CLI, or a test with no HTTP:

```python
@dataclass(frozen=True)
class DispatchShipment:
    shipment_id: ShipmentId
    carrier: Carrier


async def dispatch_shipment(command: DispatchShipment, uow: ShippingUnitOfWork, clock: Clock) -> None:
    async with uow:
        shipment = await uow.shipments.get(command.shipment_id)
        if shipment is None:
            raise ShipmentNotFound(command.shipment_id)
        shipment.dispatch(command.carrier, at=clock())
        await uow.commit()
```

- It loads, calls the domain, saves. A decision in the handler (an `if` on a
  business condition) is a rule that belongs in `domain/`.
- A write returns nothing or the new id, never a response schema. The
  endpoint maps it.
- An endpoint does only transport: parse, build the command, call the handler,
  map the result and the status. No business `if`, no query, no commit.

## Unit of work

The unit of work owns the transaction and the repositories of one module:

- `async with uow:` opens it; leaving the block without `commit()` rolls back.
  Nothing commits anywhere else: not a repository, not an endpoint, not a
  dependency's teardown.
- One unit of work per use case; never shared across requests.
- Its `Protocol` sits beside the SQLAlchemy implementation in `adapters/`;
  handlers type against the `Protocol`, tests pass a fake. Each repository on
  it is a read-only property: a plain attribute is invariant, so a fake
  holding a fake repository would fail the type check.

```python
class ShippingUnitOfWork(Protocol):
    @property
    def shipments(self) -> ShipmentRepository: ...

    async def __aenter__(self) -> Self: ...
    async def __aexit__(self, *exc_info: object) -> None: ...
    async def commit(self) -> None: ...
```

## Events after commit

`commit()` commits, then takes the new events from every aggregate it loaded
and publishes them in-process, in order. A slice that reacts to an event is a
slice like any other, triggered by the event instead of a route:

```
billing/
  on_shipment_dispatched/
    handler.py        async def on_shipment_dispatched(event: ShipmentDispatched, uow: BillingUnitOfWork) -> None
```

- `bootstrap.py` is the only place that maps events to handlers.
- Each event handler runs in its own unit of work: its failure does not undo
  the write that raised the event. Log it with the event and the request id.
- An effect that must survive a crash, or that leaves the process (a queue, a
  webhook), goes through an outbox table written in the same transaction.

## Query slices read directly

A `get_` or `list_` slice skips the aggregates and the repository: its handler
selects exactly the columns it returns, with the session, and may return its
own response schema, since the slice is its only reader. For pagination and
the index it needs, see the `api-design` skill.

## Dependency injection

- **`create_app()` does no I/O**, so tests and the OpenAPI export can build it.
  The engine, the session factory, and every client are built once in its
  `lifespan`, by `bootstrap.py`, and closed there.
- **Endpoints get dependencies through `Depends`**, declared once as
  `Annotated` aliases beside their provider:
  `ShippingUow = Annotated[ShippingUnitOfWork, Depends(get_shipping_uow)]`.
  Tests replace a provider with `app.dependency_overrides`.
- **No module-level instances**: no client built at import, no lazily built
  `global`, no `@lru_cache` singleton that tests must clear.
- **Settings are one `pydantic-settings` class** in `shared/settings.py`,
  built once and injected. Nothing else reads `os.environ`.
- **Time is a dependency**: `Clock = Callable[[], datetime]`, by default
  `lambda: datetime.now(UTC)`. Code that needs the time takes a clock.

## Async

- An `async def` endpoint or handler awaits only async I/O. A blocking call
  (a sync SDK, `requests`, `time.sleep`, CPU-heavy work) stalls every request
  on the worker: make the endpoint a plain `def`, which FastAPI runs in its
  thread pool, or wrap the call in `anyio.to_thread.run_sync`.
- Every outbound call has a timeout, and every client is built once so its
  connection pool is shared.

## Lint

Ruff holds the clock, the settings, the blocking calls and the timeouts
above: the preset `${CLAUDE_PLUGIN_ROOT}/presets/ruff-lint.toml` bans the
direct time and environment calls outside `bootstrap.py` (`TID251`), and
turns on `ASYNC` and `S113`. `/mochi:setup-project` adds it to the project.
