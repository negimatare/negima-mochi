---
name: openapi
description: OpenAPI conventions for FastAPI services in this stack — the spec as a published contract, operation ids from the use-case function name, tags and summaries per route, every error status documented as problem+json, schema names that read well in generated clients, a committed openapi.json kept current by a test, and generated clients that are never edited by hand. Use when adding or changing routes, request or response schemas, the app factory, or the spec export.
user-invocable: false
paths:
  - "**/endpoint.py"
  - "**/schemas.py"
  - "**/main.py"
  - "**/routes/**/*.py"
  - "**/entrypoints/**/*.py"
  - "**/openapi*.json"
  - "**/*openapi*.py"
---

# OpenAPI

The spec is the contract clients are generated from: its operation ids become
method names and its schema names become types. Write it for them.

## The app

```python
app = FastAPI(
    title="Shipping API",
    version=settings.api_version,
    generate_unique_id_function=lambda route: route.name,
    responses={422: problem_response("The request is malformed or invalid")},
)
document_problems(app)
```

- **Operation ids are the endpoint function's name**, the use case's name
  (`create_shipment`), so the client method reads the same. Renaming the
  function renames every client's method: to rename without breaking them,
  keep the old id with `operation_id=`.
- **The app-wide `422`** replaces FastAPI's default `HTTPValidationError`
  schema with the problem schema on every route.
- `shared/openapi.py` holds both helpers. `problem_response()` documents a
  status as `application/problem+json` only, by `$ref`; passing `model=`
  instead would also document it as `application/json`. So
  `document_problems()` adds the `Problem` schema to the components:

```python
def problem_response(description: str) -> dict[str, Any]:
    schema = {"$ref": "#/components/schemas/Problem"}
    return {"description": description, "content": {"application/problem+json": {"schema": schema}}}


def document_problems(app: FastAPI) -> None:
    def openapi() -> dict[str, Any]:
        spec = FastAPI.openapi(app)
        spec.setdefault("components", {}).setdefault("schemas", {})["Problem"] = Problem.model_json_schema()
        return spec

    app.openapi = openapi
```

## Each route

```python
router = APIRouter()


@router.post(
    "/{shipment_id}/dispatch",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Dispatch a shipment",
    responses={404: problem_response("No such shipment"), 409: problem_response("Already dispatched")},
)
async def dispatch_shipment(shipment_id: ShipmentId, body: DispatchShipmentRequest, uow: ShippingUow, clock: AppClock) -> None:
    """Hands the shipment to its carrier. Dispatching is final: it cannot be cancelled afterwards."""
```

- A slice's router has no prefix and paths relative to the resource (`""`,
  `"/{shipment_id}"`). The module's `__init__.py` gives the tag and the
  resource path: `router = APIRouter(tags=["shipments"])`, then, for each
  slice, `from .dispatch_shipment import router as dispatch_shipment_router`
  and `router.include_router(dispatch_shipment_router, prefix="/shipments")`. A prefix on the module's router instead fails on a slice's
  `""` path: FastAPI refuses an empty prefix and path together.
- `summary` says what it does in a few words; the docstring, which becomes the
  description, says what a client must know: rules, side effects, what is
  final. Never how it is implemented.
- The return annotation is the response schema; `status_code` is the success
  status from the `api-design` table.
- `responses=` lists every error status the use case can raise, beyond the
  app-wide 422: each domain exception the handler can raise, and 401, 403, 429
  where they apply.

## Schemas

Schema names are type names in every generated client:

- Unique across the app, named for the client: `CreateShipmentRequest`,
  `ShipmentResponse`, `ShipmentPage`.
- A page is a named subclass, `class ShipmentPage(Page[ShipmentResponse])`;
  the bare generic is named `Page_ShipmentResponse_`.
- One body model per route; several body parameters make a
  `Body_<operation>` schema.
- Separate request and response models, even when they look alike today: the
  response grows server fields (`id`, `created_at`) a client must never send.
- Closed sets are `StrEnum`s, so clients get a named type. A field whose name
  does not say enough gets `Field(description=..., examples=[...])`.

## The committed spec

- `openapi.json` is committed, written by the project's export script from
  `create_app().openapi()` with `indent=2` and a trailing newline, so its diff
  shows every contract change in review.
- A test keeps it current. It is the one snapshot test this kit asks for: the
  spec is a contract, and its diff is read in review.

```python
def test_openapi_spec_is_current() -> None:
    with warnings.catch_warnings():
        warnings.simplefilter("error")  # FastAPI warns on a duplicate operation id
        spec = create_app(Settings()).openapi()
    assert spec == json.loads(SPEC_PATH.read_text()), "openapi.json is stale: run <the export command>"
```

- After changing a route or a schema, run the export, regenerate the clients
  with the project's command, and commit the spec and the clients with the
  change. Check the spec's diff against the `api-design` list of breaking
  changes.
- Generated clients are never edited by hand, and lint, type checks, and
  coverage exclude them.
