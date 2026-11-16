---
name: architecture
description: Layout and dependency rules for FastAPI services in this stack — modules by bounded context, one vertical slice per use case (endpoint, handler, schemas), a module's domain/ and adapters/ added only when its rules or its I/O need them, the module's __init__.py as its public API, events for side effects in another module, one composition root, a flat package for a new service, and import-linter contracts that enforce the direction. Use when adding, moving, or importing modules in the service.
user-invocable: false
paths:
  - "**/*.py"
  - "**/.importlinter"
---

# Architecture

Vertical slices with Cosmic Python inside them: each use case lives in one
folder, and a module adds a domain model and adapters only when its
complexity justifies them.

## Layout

```
app/                    the package; keep the project's name for it
  main.py               create_app(): mounts each module's router, error handlers, OpenAPI
  bootstrap.py          composition root: settings, engine, unit of work, clients, event handlers
  shared/               kernel with no business rules: settings, db, problem+json, pagination, request id
  <module>/             one bounded context, named by capability (shipping, billing)
    __init__.py         public API: the module's router, built from its slices', and
                        what other modules may use
    <use_case>/         one slice per use case, named by intent (create_shipment)
      __init__.py       exports the slice's router (and an event slice's handler)
      endpoint.py       the route: parse, call the handler, map the result
      handler.py        the use case
      schemas.py        request and response models, and the mapping to and from the domain
    domain/             when rules appear: aggregates, value objects, events, exceptions
    adapters/           when I/O appears: ORM tables, repository, unit of work, external clients
```

A new service uses the flat layout (`app/`, not `src/app/`): a `src/` layout
protects a published library's packaging, and a deployed service has none.
An existing layout stays: moving it changes no behaviour, so it is never part
of another change.

## When a module earns its layers

A module starts with slices alone. Add each layer when its trigger appears,
not before:

| Add | When |
|---|---|
| `adapters/` | the module owns tables or calls an external system |
| `domain/` | a business rule appears that is worth testing without HTTP or a database (a shipment cannot be cancelled once dispatched), or a value with its own validation (`Money`, `Email`) |
| a repository and a unit of work in `adapters/` | the module has `domain/`: from then on every write goes through an aggregate |

Until it has a domain, a slice's handler reads and writes through the session
directly. Query slices keep doing so after it has one (the `service-layer`
skill's read side).

## Rules

- **Slices never import each other.** Logic two slices need moves down: a
  rule to `domain/`, I/O to `adapters/`.
- **Modules meet only through `__init__.py`.** Import `from app.billing import
  InvoiceSummary`, never `app.billing.domain.invoice`. Every public name is in
  the module's `__all__`; inside a module, siblings import each other directly.
  A public name never matches a slice folder: import-linter reads
  `from app.billing import quote_price` as an import of the slice
  `app.billing.quote_price`, and the module's contract breaks. Export
  `price_quote`, or name the slice `get_quote`.
- **A side effect in another module is an event**, not a call: shipping raises
  `ShipmentDispatched`, and `bootstrap.py` subscribes billing's handler to it.
  Data another module needs is a query function in its public API.
- **`domain/` imports only the standard library**, its own module's domain,
  and the error categories in `shared/errors.py`: no FastAPI, Pydantic,
  SQLAlchemy, or HTTP client, and no `adapters/`.
- **`shared/` earns an entry on its second module**, and never holds a
  business rule.
- **Name by capability** (`shipping`, `carrier_client.py`), never by pattern:
  no `utils.py`, `helpers.py`, `services.py`, `managers.py`, or `core.py`.
- **Only `main.py` and `bootstrap.py` know every module.**

## Enforced dependency direction

Breaking the layering is an error, with import-linter 2.5 or later (for the
`protected` contract) in the dev dependencies and its contracts in
`pyproject.toml`. Each module gets its two contracts when it is created:

```toml
[tool.importlinter]
root_package = "app"
include_external_packages = true

[[tool.importlinter.contracts]]
name = "Only shipping reaches into shipping"
type = "protected"
protected_modules = ["app.shipping.*"]
allowed_importers = ["app.shipping", "app.bootstrap"]

[[tool.importlinter.contracts]]
name = "Shipping: slices on adapters on domain"
type = "layers"
containers = ["app.shipping"]
layers = [
    "create_shipment | get_shipment | dispatch_shipment",
    "(adapters)",
    "(domain)",
]

[[tool.importlinter.contracts]]
name = "The domain stays free of frameworks"
type = "forbidden"
source_modules = ["app.*.domain"]
forbidden_modules = ["fastapi", "starlette", "pydantic", "sqlalchemy", "httpx", "requests"]
```

Pipes make the slices independent of each other; parentheses let a module
that has not earned `adapters/` or `domain/` yet pass. Add each new slice to
its module's `layers` line. When adding a contract, prove it with a deliberate
violation: a contract that passes vacuously is worthless.
