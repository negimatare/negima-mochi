---
name: api-design
description: REST conventions for FastAPI services in this stack — plural kebab-case resources under a version prefix from day one, real status codes, one error shape (RFC 9457 problem+json) mapped from domain exceptions, cursor pagination on every list, response schemas instead of ORM or domain objects, idempotent writes with Idempotency-Key, rate limits with Retry-After, bearer auth in the header, cheap liveness and deep readiness checks, and a request id in every log line. Use when adding or changing routes, request or response schemas, error handling, or middleware.
user-invocable: false
paths:
  - "**/endpoint.py"
  - "**/schemas.py"
  - "**/main.py"
  - "**/shared/**/*.py"
  - "**/routes/**/*.py"
  - "**/entrypoints/**/*.py"
---

# API design

Each rule is cheap on day one and a migration once clients depend on it.

## Resources and versions

- Plural, kebab-case nouns: `/api/v1/order-items`, `/api/v1/shipments/{shipment_id}`.
  Never verbs or camelCase (`/getOrderItems`).
- A domain action that is not a field update is a `POST` to a sub-path named
  after it: `POST /api/v1/shipments/{shipment_id}/dispatch`.
- Every route sits under one version prefix, mounted once in `create_app()`.
  Keep the project's own prefix (`/api/v1.0`) if it has one.
- Additive changes stay in the version: a new endpoint, a new response field,
  a new optional request field. A breaking change gets a new version beside
  the old one: removing or renaming a field, changing its type, making a
  field required, changing a status code, removing an endpoint.

## Status codes

| Code | When |
|---|---|
| `200` | a read, or an update that returns the resource |
| `201` | a create, with a `Location` header pointing at the new resource |
| `202` | work accepted and done later, with where to poll |
| `204` | success with no body (delete, an action with nothing to return) |
| `401` | missing or invalid credentials, with `WWW-Authenticate: Bearer` |
| `403` | authenticated but not allowed |
| `404` | no such resource, or one the caller may not know exists |
| `409` | conflicts with the resource's current state (a rule, a duplicate, a stale version) |
| `422` | well-formed but invalid input (FastAPI's validation, an `Invalid` domain error) |
| `429` | rate limited, with `Retry-After` |

Never `200` with an error in the body.

## One error shape

Every error, including FastAPI's validation errors and unexpected ones, is an
RFC 9457 problem with `Content-Type: application/problem+json`:

```json
{ "type": "https://errors.example.com/shipment-already-dispatched", "title": "Shipment already dispatched",
  "status": 409, "detail": "Shipment sh_91 was dispatched at 10:02.", "instance": "/api/v1/shipments/sh_91/dispatch",
  "requestId": "4bf9…" }
```

- `shared/errors.py` defines the categories the domain's exceptions subclass:
  `NotFound` (404), `Conflict` (409), `Invalid` (422). Each exception class
  names its `type` slug and `title`. The file imports only the standard
  library: every domain imports it, so a framework import there breaks each
  domain's import contract.
- The handlers live in `shared/problems.py`. `create_app()` registers one
  each for the domain categories, `RequestValidationError` (422, with an
  `errors` list of field and message), Starlette's `HTTPException` (so an
  unknown route is a problem too), and `Exception` (500, generic detail,
  logged with the request id). Handlers and endpoints raise domain
  exceptions; they never build error responses or catch to re-raise as
  `HTTPException`.
- A `500` never carries a message, a stack trace, or a SQL string.

## Schemas, not the database

- Every route returns a response schema from its slice's `schemas.py`, built
  by an explicit mapping (`ShipmentResponse.from_domain(shipment)`). Never an
  ORM row, a domain object, or a `dict`.
- Request schemas set `extra="forbid"`, so a misspelled field is a 422 instead
  of silently ignored.
- One field casing for the whole API, set once on a shared base schema.
  camelCase for JavaScript clients: `alias_generator=to_camel` with
  `validate_by_name=True`.

## Pagination on every list

A list that can grow takes `?limit=` and `?cursor=` and returns a page:

```python
class Page[T](ApiSchema):
    items: list[T]
    next_cursor: str | None
```

- A route returns a named subclass, `class ShipmentPage(Page[ShipmentSummary])`
  in the slice's `schemas.py`, never the bare generic: clients would get a
  type named `Page_ShipmentSummary_` (see the `openapi` skill).
- `limit` defaults to 20 and is capped (`Query(20, ge=1, le=100)`).
- The cursor is opaque: the last row's sort key, encoded. The query is a keyset
  (`WHERE (created_at, id) > (:created_at, :id) ORDER BY created_at, id
  LIMIT :limit + 1`); the extra row says whether there is a next page. No
  `OFFSET` on a list that grows, and no total count unless a client needs it.

## Idempotent writes

A `POST` whose retry would create or charge twice accepts an
`Idempotency-Key` header, handled once by a shared dependency, not by each
handler. The first request stores the key, the caller, a hash of the body,
and the response for 24 hours. A retry with the same body gets the stored
response; the same key with another body gets a 422; a key still in flight
gets a 409.

## Rate limits and auth

- A limited route answers `429` with `Retry-After` in seconds and a problem
  body, and documents it. Where the gateway limits, the app does not repeat it.
- Credentials travel only in `Authorization: Bearer <token>`, read through a
  FastAPI security dependency (`HTTPBearer` or `OAuth2PasswordBearer`) so the
  scheme appears in OpenAPI. Never a token in a query string or a body:
  proxies and logs keep URLs.

## Health and observability

- `GET /health` is liveness: no I/O, `200 {"status": "ok"}`. `GET /health/ready`
  is readiness: it checks the database and every required dependency, each
  with a short timeout, and answers `503` with each dependency's status and
  no error detail. Both sit outside the version prefix, with no auth.
- A middleware takes `X-Request-ID` from the request or generates one, keeps it
  in a `contextvar`, returns it in the response header, and adds it to every
  log record and problem body.
- One structured access log line per request: method, route template (not the
  raw path), status, `duration_ms`, and the user id when authenticated. Never
  a token, a password, or a request body.
