---
name: domain-model
description: Domain model conventions for FastAPI services in this stack, after Cosmic Python — plain classes with no framework, value objects as frozen dataclasses that validate on construction, entities with identity, aggregates as consistency boundaries, states as sum types matched exhaustively, domain events and exceptions named in the business's words, rules that never do I/O, explicit optionality, and casts only at untyped boundaries. Use when writing or changing a module's domain/ or the rules a handler applies.
user-invocable: false
paths:
  - "**/domain/**/*.py"
  - "**/domain.py"
  - "**/handler.py"
---

# Domain model

The domain is the part that would survive swapping FastAPI, the database, and
every client. It is plain Python: dataclasses, enums, and functions from the
standard library. Pydantic stays at the edges, in `schemas.py` and settings.

## Value objects

Immutable, equal by value, and valid from the moment they exist. Validate in
`__post_init__`, so no code path can build an invalid one:

```python
@dataclass(frozen=True, slots=True)
class Money:
    amount: Decimal
    currency: Currency

    def __post_init__(self) -> None:
        if self.amount < 0:
            raise NegativeAmount(self.amount)

    def __add__(self, other: Self) -> Self:
        if other.currency != self.currency:
            raise CurrencyMismatch(self.currency, other.currency)
        return replace(self, amount=self.amount + other.amount)
```

A string with rules (`Email`, `Sku`, `ShipmentId`) is a value object too, not
a bare `str` passed around and re-checked.

## Entities and aggregates

An entity has an identity that outlives its attributes: equality and hashing
use the id alone. An **aggregate** is the entity that guards a consistency
boundary, and the only way in for changes to anything inside it:

- One aggregate per transaction. A use case that must change two aggregates
  changes one and raises an event; the other changes in its own transaction.
- Other aggregates are referenced by id, never held as objects.
- Every change goes through a method named in the business's words
  (`shipment.dispatch(carrier, at=now)`), which checks the invariant and
  records the event. No caller sets fields from outside.
- A `version: int` the repository checks on save, when two requests can
  change the same aggregate at once (see the `persistence` skill).

## States as sum types

A lifecycle where each state carries different data is a union of frozen
dataclasses, matched by type, with `assert_never` so a new state fails the
type check where it is not handled:

```python
ShipmentState = Pending | Dispatched | Delivered

match shipment.state:
    case Pending():
        ...
    case Dispatched(carrier=carrier):
        ...
    case Delivered():
        ...
    case _:
        assert_never(shipment.state)
```

A plain label with no data of its own is a `StrEnum`. Never a set of booleans
(`is_dispatched`, `is_delivered`) that can contradict each other.

## Rules never do I/O

A rule is a method or a pure function: state in, decision or new state out.
It never reads the clock, the database, the settings, or an API. The handler
fetches what a rule needs and passes it in, so the rule is tested with no
setup and no fakes:

```python
def can_cancel(shipment: Shipment, now: datetime) -> bool: ...
```

## Events and exceptions

- **Events** are frozen dataclasses named in the past tense
  (`ShipmentDispatched`), carrying ids and values, never aggregates. The
  aggregate appends them to `self.events`; the unit of work publishes them
  after commit (see the `service-layer` skill).
- **Exceptions** are named after the rule they guard
  (`ShipmentAlreadyDispatched`), never `ValueError` or a message string. Each
  subclasses one of the three categories in `shared/errors.py`
  (`NotFound`, `Conflict`, `Invalid`) so the API maps it to a status without
  the domain knowing HTTP (see the `api-design` skill).

## Types

- A value that can be absent says so: `Shipment | None`, and the caller
  handles `None`. Never a sentinel, never an empty string.
- No `Any` in the domain. `cast` only at an untyped boundary, with a comment.
- Names come from the business (`dispatch`, `consignee`), the same words the
  API, the tests, and the people who own the rules use.
