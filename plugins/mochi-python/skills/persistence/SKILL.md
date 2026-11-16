---
name: persistence
description: Persistence conventions for FastAPI services in this stack that use SQLAlchemy 2 and Alembic — ORM models kept in adapters and mapped to aggregates by the repository, one repository per aggregate with no commit, one session per unit of work, relationships that refuse lazy loads, optimistic locking with a version column, query slices that select only what they return, and Alembic migrations that are reviewed, never edited once applied, free of app imports, and split into expand and contract steps. Use when writing ORM models, repositories, the unit of work, queries, or migrations.
user-invocable: false
paths:
  - "**/adapters/**/*.py"
  - "**/handler.py"
  - "**/migrations/**/*.py"
  - "**/alembic/**/*.py"
  - "**/shared/db*.py"
metadata:
  mochi-requires: "sqlalchemy"
---

# Persistence

## ORM models stay in adapters

ORM models (`Mapped[...]` declarative classes) live in the module's
`adapters/orm.py`. The domain never imports them. The repository maps between
a row and an aggregate explicitly, so a column rename or a lazy load never
reaches a rule:

```python
class SqlAlchemyShipmentRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self.seen: set[Shipment] = set()

    async def get(self, shipment_id: ShipmentId) -> Shipment | None:
        row = await self._session.get(ShipmentRow, shipment_id, options=[selectinload(ShipmentRow.parcels)])
        if row is None:
            return None
        shipment = _to_domain(row)
        self.seen.add(shipment)
        return shipment
```

A project already on imperative mapping (`registry.map_imperatively`, as in
Cosmic Python) keeps it; do not mix the two in one module.

## Repository and unit of work

- One repository per aggregate: `get`, `add`, and the lookups the module's
  writes need. Lists for screens belong to query slices, not repositories.
- A repository never commits or opens a session; the unit of work does both.
- `seen` holds every aggregate the repository returned or added, so the unit
  of work can collect their events after commit.
- One `AsyncSession` per unit of work, from one `async_sessionmaker(engine,
  expire_on_commit=False)` built at startup. A session is never shared across
  requests or tasks, and never awaited from two coroutines at once
  (`asyncio.gather` on one session).

## Loading

- Relationships declare `lazy="raise"`, so an unplanned load fails in tests
  instead of becoming a query per row, or a `MissingGreenlet` error under
  async. Each query names what it loads (`selectinload`, `joinedload`).
- A query slice selects only the columns it returns,
  `select(ShipmentRow.id, ShipmentRow.status)`, never whole rows to discard
  most of.

## Concurrent writes

An aggregate two requests can change at once has a version column
(`__mapper_args__ = {"version_id_col": version}`). The unit of work turns the
`StaleDataError` it raises into the module's `ConcurrentUpdate`, a `Conflict`,
so the client gets a 409 and retries, instead of one write silently winning.

## Migrations

- Autogenerate is a draft. Read and correct it: it sees a rename as a drop
  plus an add, and misses server defaults and some enum changes.
- One migration per change. Never edit a migration that has run anywhere
  but your machine; write a new one.
- A migration imports no app code and no ORM model. It uses `op` and literal
  `sa.table()` definitions, so changing a model later cannot break an old
  migration.
- A rename, a new `NOT NULL`, or a type change is expand then contract: add
  the new shape, deploy code that works with both, backfill in batches, then
  enforce and drop the old shape in a later migration.
- `alembic upgrade head` on an empty database and `alembic check` (models
  and migrations agree) run in the test suite or CI.
