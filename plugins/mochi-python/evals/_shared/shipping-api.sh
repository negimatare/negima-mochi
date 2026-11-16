# Sourced by fixture.sh: a FastAPI shipping service laid out as the
# mochi-python architecture skill describes (modules of use-case slices, a
# domain and adapters in shipping, one composition root, problem+json errors,
# a committed openapi.json, a fake unit of work for tests). It has no .venv,
# so nothing runs; graders read files.
git init -q -b main
git config user.name eval && git config user.email eval@example.invalid
mkdir -p app/shared app/shipping/{domain,adapters,create_shipment,get_shipment,list_shipments,dispatch_shipment} \
  app/billing/{domain,get_quote} app/health/{check_liveness,check_readiness} migrations/versions scripts tests/shipping tests/billing
cat > pyproject.toml <<'X'
[project]
name = "shipping-api"
version = "0.1.0"
requires-python = ">=3.12"
dependencies = [
    "alembic>=1.16",
    "asyncpg>=0.30",
    "fastapi>=0.120",
    "pydantic-settings>=2.10",
    "sqlalchemy[asyncio]>=2.0.40",
]

[dependency-groups]
dev = [
    "httpx>=0.28",
    "import-linter>=2.6",
    "pyright>=1.1.400",
    "pytest>=8.4",
    "pytest-asyncio>=1.0",
    "ruff>=0.12",
]

[tool.pytest.ini_options]
asyncio_mode = "auto"
pythonpath = "."

[tool.pyright]
include = ["app", "tests", "scripts"]
strict = ["app"]

[tool.ruff]
line-length = 120

[tool.ruff.lint]
select = ["E", "F", "I", "B", "UP", "ASYNC"]

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
    "create_shipment | get_shipment | list_shipments | dispatch_shipment",
    "(adapters)",
    "(domain)",
]

[[tool.importlinter.contracts]]
name = "Only billing reaches into billing"
type = "protected"
protected_modules = ["app.billing.*"]
allowed_importers = ["app.billing", "app.bootstrap"]

[[tool.importlinter.contracts]]
name = "Billing: slices on adapters on domain"
type = "layers"
containers = ["app.billing"]
layers = [
    "get_quote",
    "(adapters)",
    "(domain)",
]

[[tool.importlinter.contracts]]
name = "Only health reaches into health"
type = "protected"
protected_modules = ["app.health.*"]
allowed_importers = ["app.health", "app.bootstrap"]

[[tool.importlinter.contracts]]
name = "Health: slices on adapters on domain"
type = "layers"
containers = ["app.health"]
layers = [
    "check_liveness | check_readiness",
    "(adapters)",
    "(domain)",
]

[[tool.importlinter.contracts]]
name = "The domain stays free of frameworks"
type = "forbidden"
source_modules = ["app.*.domain"]
forbidden_modules = ["fastapi", "starlette", "pydantic", "sqlalchemy", "httpx", "requests"]
X
cat > CLAUDE.md <<'X'
# Shipping API

A FastAPI service in Python 3.12 that books and dispatches parcel shipments,
on PostgreSQL through SQLAlchemy 2 (async) and Alembic, managed with uv. The
web team generates its TypeScript client from `openapi.json`.

## Verification

Run from this folder before calling a change done:

```bash
uv run pyright          # strict on app/
uv run ruff check .
uv run lint-imports     # the module and layer contracts in pyproject.toml
uv run pytest           # tests/integration/ needs SHIPPING_DATABASE_URL
```

## Project-specific rules

- After changing a route or a schema, regenerate the spec with
  `uv run python -m scripts.export_openapi` and commit it with the change.
- Migrations live in `migrations/versions/`, numbered `NNNN_<what>.py`.
X
touch app/__init__.py app/shared/__init__.py scripts/__init__.py tests/__init__.py tests/shipping/__init__.py tests/billing/__init__.py

# ---------- shared
cat > app/shared/errors.py <<'X'
from typing import ClassVar


class DomainError(Exception):
    """A broken business rule. The API turns its category into a status."""

    status: ClassVar[int]
    type: ClassVar[str]
    title: ClassVar[str]


class NotFound(DomainError):
    status = 404


class Conflict(DomainError):
    status = 409


class Invalid(DomainError):
    status = 422
X
cat > app/shared/schemas.py <<'X'
from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class ApiSchema(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, validate_by_name=True)
X
cat > app/shared/pagination.py <<'X'
import base64
import binascii
import json
from typing import Any

from .errors import Invalid
from .schemas import ApiSchema


class Page[T](ApiSchema):
    items: list[T]
    next_cursor: str | None


class InvalidCursor(Invalid):
    type = "invalid-cursor"
    title = "Invalid cursor"


def encode_cursor(*key: str) -> str:
    return base64.urlsafe_b64encode(json.dumps(key).encode()).decode()


def decode_cursor(cursor: str) -> list[Any]:
    try:
        return json.loads(base64.urlsafe_b64decode(cursor))
    except (binascii.Error, ValueError) as error:
        raise InvalidCursor("The cursor is not one this API returned.") from error
X
cat > app/shared/settings.py <<'X'
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="SHIPPING_")

    database_url: str = "postgresql+asyncpg://localhost/shipping"
    api_version: str = "1.0.0"
X
cat > app/shared/clock.py <<'X'
from collections.abc import Callable
from datetime import UTC, datetime

type Clock = Callable[[], datetime]


def system_clock() -> datetime:
    return datetime.now(UTC)
X
cat > app/shared/events.py <<'X'
import logging
from collections.abc import Awaitable, Callable, Mapping, Sequence
from typing import Any

logger = logging.getLogger(__name__)

type EventHandler = Callable[[Any], Awaitable[None]]
type Publish = Callable[[object], Awaitable[None]]


def build_publisher(handlers: Mapping[type, Sequence[EventHandler]]) -> Publish:
    async def publish(event: object) -> None:
        for handler in handlers.get(type(event), ()):
            try:
                await handler(event)
            except Exception:
                logger.exception("Event handler failed", extra={"event": type(event).__name__})

    return publish
X
cat > app/shared/db.py <<'X'
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass
X
cat > app/shared/dependencies.py <<'X'
from collections.abc import AsyncIterator
from typing import Annotated

from fastapi import Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from .clock import Clock
from .events import Publish


def get_session_factory(request: Request) -> async_sessionmaker[AsyncSession]:
    return request.app.state.resources.session_factory


def get_clock(request: Request) -> Clock:
    return request.app.state.resources.clock


def get_publish(request: Request) -> Publish:
    return request.app.state.resources.publish


SessionFactory = Annotated[async_sessionmaker[AsyncSession], Depends(get_session_factory)]
AppClock = Annotated[Clock, Depends(get_clock)]
Publisher = Annotated[Publish, Depends(get_publish)]


async def get_session(factory: SessionFactory) -> AsyncIterator[AsyncSession]:
    async with factory() as session:
        yield session


Session = Annotated[AsyncSession, Depends(get_session)]
X
cat > app/shared/openapi.py <<'X'
from typing import Any

from fastapi import FastAPI
from pydantic import BaseModel


class Problem(BaseModel):
    type: str
    title: str
    status: int
    detail: str | None = None
    instance: str | None = None
    errors: list[dict[str, str]] | None = None


def problem_response(description: str) -> dict[str, Any]:
    schema = {"$ref": "#/components/schemas/Problem"}
    return {"description": description, "content": {"application/problem+json": {"schema": schema}}}


def document_problems(app: FastAPI) -> None:
    def openapi() -> dict[str, Any]:
        spec = FastAPI.openapi(app)
        spec.setdefault("components", {}).setdefault("schemas", {})["Problem"] = Problem.model_json_schema()
        return spec

    app.openapi = openapi
X
cat > app/shared/problems.py <<'X'
import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException

from .errors import DomainError
from .openapi import Problem

logger = logging.getLogger(__name__)


def _problem(request: Request, status: int, slug: str, title: str, detail: str | None = None,
             errors: list[dict[str, str]] | None = None) -> JSONResponse:
    body = Problem(type=f"https://errors.shipping.example/{slug}", title=title, status=status, detail=detail,
                   instance=request.url.path, errors=errors)
    return JSONResponse(body.model_dump(exclude_none=True), status_code=status, media_type="application/problem+json")


def install_problem_handlers(app: FastAPI) -> None:
    @app.exception_handler(DomainError)
    async def domain_error(request: Request, error: DomainError) -> JSONResponse:
        return _problem(request, error.status, error.type, error.title, str(error))

    @app.exception_handler(RequestValidationError)
    async def invalid_request(request: Request, error: RequestValidationError) -> JSONResponse:
        errors = [{"field": ".".join(str(part) for part in e["loc"]), "message": e["msg"]} for e in error.errors()]
        return _problem(request, 422, "invalid-request", "Invalid request", errors=errors)

    @app.exception_handler(HTTPException)
    async def http_error(request: Request, error: HTTPException) -> JSONResponse:
        return _problem(request, error.status_code, "http-error", str(error.detail))

    @app.exception_handler(Exception)
    async def unexpected(request: Request, error: Exception) -> JSONResponse:
        logger.exception("Unexpected error", extra={"path": request.url.path})
        return _problem(request, 500, "internal-error", "Internal server error")
X

# ---------- composition root
cat > app/bootstrap.py <<'X'
from dataclasses import dataclass

from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker, create_async_engine

from app.shared.clock import Clock, system_clock
from app.shared.events import EventHandler, Publish, build_publisher
from app.shared.settings import Settings


@dataclass(frozen=True)
class Resources:
    engine: AsyncEngine
    session_factory: async_sessionmaker[AsyncSession]
    clock: Clock
    publish: Publish


def bootstrap(settings: Settings) -> Resources:
    engine = create_async_engine(settings.database_url, pool_pre_ping=True)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    event_handlers: dict[type, list[EventHandler]] = {}
    return Resources(engine, session_factory, system_clock, build_publisher(event_handlers))
X
cat > app/main.py <<'X'
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app import billing, health, shipping
from app.bootstrap import bootstrap
from app.shared.openapi import document_problems, problem_response
from app.shared.problems import install_problem_handlers
from app.shared.settings import Settings


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or Settings()

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncGenerator[None]:
        resources = bootstrap(settings)
        app.state.resources = resources
        yield
        await resources.engine.dispose()

    app = FastAPI(
        title="Shipping API",
        version=settings.api_version,
        lifespan=lifespan,
        generate_unique_id_function=lambda route: route.name,
        responses={422: problem_response("The request is malformed or invalid")},
    )
    install_problem_handlers(app)
    document_problems(app)
    app.include_router(shipping.router, prefix="/api/v1")
    app.include_router(billing.router, prefix="/api/v1")
    app.include_router(health.router)
    return app
X

# ---------- shipping: domain
cat > app/shipping/domain/values.py <<'X'
import re
from dataclasses import dataclass
from enum import StrEnum
from typing import NewType

from .exceptions import InvalidPostalCode

ShipmentId = NewType("ShipmentId", str)

POSTAL_CODE = re.compile(r"\d{3}-\d{4}")


class Carrier(StrEnum):
    YAMATO = "yamato"
    SAGAWA = "sagawa"
    JAPAN_POST = "japan_post"


class ShipmentStatus(StrEnum):
    PENDING = "pending"
    DISPATCHED = "dispatched"
    DELIVERED = "delivered"


@dataclass(frozen=True, slots=True)
class Consignee:
    name: str
    postal_code: str

    def __post_init__(self) -> None:
        if not POSTAL_CODE.fullmatch(self.postal_code):
            raise InvalidPostalCode(self.postal_code)
X
cat > app/shipping/domain/exceptions.py <<'X'
from app.shared.errors import Conflict, Invalid, NotFound


class ShipmentNotFound(NotFound):
    type = "shipment-not-found"
    title = "Shipment not found"

    def __init__(self, shipment_id: str) -> None:
        super().__init__(f"No shipment {shipment_id}.")


class ShipmentAlreadyDispatched(Conflict):
    type = "shipment-already-dispatched"
    title = "Shipment already dispatched"

    def __init__(self, shipment_id: str) -> None:
        super().__init__(f"Shipment {shipment_id} has already left.")


class ShipmentChangedConcurrently(Conflict):
    type = "shipment-changed-concurrently"
    title = "Shipment changed concurrently"


class InvalidPostalCode(Invalid):
    type = "invalid-postal-code"
    title = "Invalid postal code"

    def __init__(self, postal_code: str) -> None:
        super().__init__(f"{postal_code!r} is not a postal code like 150-0002.")
X
cat > app/shipping/domain/events.py <<'X'
from dataclasses import dataclass
from datetime import datetime

from .values import Carrier, ShipmentId


@dataclass(frozen=True, slots=True)
class ShipmentDispatched:
    shipment_id: ShipmentId
    carrier: Carrier
    dispatched_at: datetime
X
cat > app/shipping/domain/model.py <<'X'
from dataclasses import dataclass, field
from datetime import datetime
from typing import Self, assert_never
from uuid import uuid4

from .events import ShipmentDispatched
from .exceptions import ShipmentAlreadyDispatched
from .values import Carrier, Consignee, ShipmentId, ShipmentStatus


@dataclass(frozen=True, slots=True)
class Pending:
    pass


@dataclass(frozen=True, slots=True)
class Dispatched:
    carrier: Carrier
    dispatched_at: datetime


@dataclass(frozen=True, slots=True)
class Delivered:
    carrier: Carrier
    delivered_at: datetime


type ShipmentState = Pending | Dispatched | Delivered


@dataclass(eq=False)
class Shipment:
    id: ShipmentId
    consignee: Consignee
    weight_grams: int
    booked_at: datetime
    state: ShipmentState = field(default_factory=Pending)
    events: list[object] = field(default_factory=list[object])

    @classmethod
    def book(cls, consignee: Consignee, weight_grams: int, at: datetime) -> Self:
        return cls(ShipmentId(f"sh_{uuid4().hex[:12]}"), consignee, weight_grams, booked_at=at)

    def __eq__(self, other: object) -> bool:
        return isinstance(other, Shipment) and other.id == self.id

    def __hash__(self) -> int:
        return hash(self.id)

    @property
    def status(self) -> ShipmentStatus:
        match self.state:
            case Pending():
                return ShipmentStatus.PENDING
            case Dispatched():
                return ShipmentStatus.DISPATCHED
            case Delivered():
                return ShipmentStatus.DELIVERED
            case _:
                assert_never(self.state)

    def dispatch(self, carrier: Carrier, at: datetime) -> None:
        match self.state:
            case Pending():
                self.state = Dispatched(carrier, at)
                self.events.append(ShipmentDispatched(self.id, carrier, at))
            case Dispatched() | Delivered():
                raise ShipmentAlreadyDispatched(self.id)
            case _:
                assert_never(self.state)
X
cat > app/shipping/domain/__init__.py <<'X'
from .events import ShipmentDispatched
from .exceptions import InvalidPostalCode, ShipmentAlreadyDispatched, ShipmentChangedConcurrently, ShipmentNotFound
from .model import Delivered, Dispatched, Pending, Shipment, ShipmentState
from .values import Carrier, Consignee, ShipmentId, ShipmentStatus

__all__ = [
    "Carrier",
    "Consignee",
    "Delivered",
    "Dispatched",
    "InvalidPostalCode",
    "Pending",
    "Shipment",
    "ShipmentAlreadyDispatched",
    "ShipmentChangedConcurrently",
    "ShipmentDispatched",
    "ShipmentId",
    "ShipmentNotFound",
    "ShipmentState",
    "ShipmentStatus",
]
X

# ---------- shipping: adapters
cat > app/shipping/adapters/orm.py <<'X'
from datetime import datetime

from sqlalchemy import DateTime, Index, String
from sqlalchemy.orm import Mapped, mapped_column

from app.shared.db import Base


class ShipmentRow(Base):
    __tablename__ = "shipments"
    __table_args__ = (Index("ix_shipments_booked_at_id", "booked_at", "id"),)

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    consignee_name: Mapped[str] = mapped_column(String(200))
    postal_code: Mapped[str] = mapped_column(String(8))
    weight_grams: Mapped[int]
    status: Mapped[str] = mapped_column(String(16))
    carrier: Mapped[str | None] = mapped_column(String(16))
    booked_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    dispatched_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    delivered_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    version: Mapped[int] = mapped_column(default=1)

    __mapper_args__ = {"version_id_col": version}
X
cat > app/shipping/adapters/repository.py <<'X'
from typing import Protocol, assert_never

from sqlalchemy.ext.asyncio import AsyncSession

from ..domain import Carrier, Consignee, Delivered, Dispatched, Pending, Shipment, ShipmentId, ShipmentState
from .orm import ShipmentRow


class ShipmentRepository(Protocol):
    seen: set[Shipment]

    async def get(self, shipment_id: ShipmentId) -> Shipment | None: ...

    def add(self, shipment: Shipment) -> None: ...


class SqlAlchemyShipmentRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._rows: dict[ShipmentId, ShipmentRow] = {}
        self.seen: set[Shipment] = set()

    async def get(self, shipment_id: ShipmentId) -> Shipment | None:
        row = await self._session.get(ShipmentRow, shipment_id)
        if row is None:
            return None
        shipment = _to_domain(row)
        self._rows[shipment.id] = row
        self.seen.add(shipment)
        return shipment

    def add(self, shipment: Shipment) -> None:
        row = ShipmentRow(id=shipment.id, booked_at=shipment.booked_at)
        self._session.add(row)
        self._rows[shipment.id] = row
        self.seen.add(shipment)

    def sync(self) -> None:
        for shipment in self.seen:
            _write(shipment, self._rows[shipment.id])


def _state(row: ShipmentRow) -> ShipmentState:
    if row.status == "pending":
        return Pending()
    assert row.carrier is not None
    if row.status == "dispatched":
        assert row.dispatched_at is not None
        return Dispatched(Carrier(row.carrier), row.dispatched_at)
    assert row.delivered_at is not None
    return Delivered(Carrier(row.carrier), row.delivered_at)


def _to_domain(row: ShipmentRow) -> Shipment:
    consignee = Consignee(row.consignee_name, row.postal_code)
    return Shipment(ShipmentId(row.id), consignee, row.weight_grams, row.booked_at, _state(row))


def _write(shipment: Shipment, row: ShipmentRow) -> None:
    row.consignee_name = shipment.consignee.name
    row.postal_code = shipment.consignee.postal_code
    row.weight_grams = shipment.weight_grams
    row.status = shipment.status
    match shipment.state:
        case Pending():
            pass
        case Dispatched(carrier=carrier, dispatched_at=at):
            row.carrier, row.dispatched_at = carrier, at
        case Delivered(carrier=carrier, delivered_at=at):
            row.carrier, row.delivered_at = carrier, at
        case _:
            assert_never(shipment.state)
X
cat > app/shipping/adapters/unit_of_work.py <<'X'
from typing import Annotated, Protocol, Self

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker
from sqlalchemy.orm.exc import StaleDataError

from app.shared.dependencies import Publisher, SessionFactory
from app.shared.events import Publish

from ..domain import ShipmentChangedConcurrently
from .repository import ShipmentRepository, SqlAlchemyShipmentRepository


class ShippingUnitOfWork(Protocol):
    @property
    def shipments(self) -> ShipmentRepository: ...

    async def __aenter__(self) -> Self: ...

    async def __aexit__(self, *exc_info: object) -> None: ...

    async def commit(self) -> None: ...


class SqlAlchemyShippingUnitOfWork:
    def __init__(self, session_factory: async_sessionmaker[AsyncSession], publish: Publish) -> None:
        self._session_factory = session_factory
        self._publish = publish

    async def __aenter__(self) -> Self:
        self._session = self._session_factory()
        self.shipments = SqlAlchemyShipmentRepository(self._session)
        return self

    async def __aexit__(self, *exc_info: object) -> None:
        await self._session.rollback()
        await self._session.close()

    async def commit(self) -> None:
        self.shipments.sync()
        try:
            await self._session.commit()
        except StaleDataError as error:
            raise ShipmentChangedConcurrently("Another request changed this shipment; retry.") from error
        for shipment in self.shipments.seen:
            while shipment.events:
                await self._publish(shipment.events.pop(0))


def get_shipping_uow(session_factory: SessionFactory, publish: Publisher) -> ShippingUnitOfWork:
    return SqlAlchemyShippingUnitOfWork(session_factory, publish)


ShippingUow = Annotated[ShippingUnitOfWork, Depends(get_shipping_uow)]
X
touch app/shipping/adapters/__init__.py

# ---------- shipping: slices
cat > app/shipping/create_shipment/handler.py <<'X'
from dataclasses import dataclass

from app.shared.clock import Clock

from ..adapters.unit_of_work import ShippingUnitOfWork
from ..domain import Consignee, Shipment, ShipmentId


@dataclass(frozen=True)
class CreateShipment:
    consignee_name: str
    postal_code: str
    weight_grams: int


async def create_shipment(command: CreateShipment, uow: ShippingUnitOfWork, clock: Clock) -> ShipmentId:
    shipment = Shipment.book(Consignee(command.consignee_name, command.postal_code), command.weight_grams, at=clock())
    async with uow:
        uow.shipments.add(shipment)
        await uow.commit()
    return shipment.id
X
cat > app/shipping/create_shipment/schemas.py <<'X'
from pydantic import ConfigDict, Field

from app.shared.schemas import ApiSchema


class CreateShipmentRequest(ApiSchema):
    model_config = ConfigDict(extra="forbid")

    consignee_name: str = Field(min_length=1, max_length=200)
    postal_code: str = Field(description="A Japanese postal code", examples=["150-0002"])
    weight_grams: int = Field(gt=0, le=30_000)


class CreatedShipmentResponse(ApiSchema):
    shipment_id: str
X
cat > app/shipping/create_shipment/endpoint.py <<'X'
from fastapi import APIRouter, Response, status

from app.shared.dependencies import AppClock

from ..adapters.unit_of_work import ShippingUow
from . import handler
from .schemas import CreatedShipmentResponse, CreateShipmentRequest

router = APIRouter()


@router.post("", status_code=status.HTTP_201_CREATED, summary="Book a shipment")
async def create_shipment(
    body: CreateShipmentRequest, response: Response, uow: ShippingUow, clock: AppClock
) -> CreatedShipmentResponse:
    """Books a shipment for the consignee. It stays pending until it is dispatched."""
    command = handler.CreateShipment(body.consignee_name, body.postal_code, body.weight_grams)
    shipment_id = await handler.create_shipment(command, uow, clock)
    response.headers["Location"] = f"/api/v1/shipments/{shipment_id}"
    return CreatedShipmentResponse(shipment_id=shipment_id)
X
cat > app/shipping/get_shipment/schemas.py <<'X'
from datetime import datetime

from app.shared.schemas import ApiSchema

from ..domain import Carrier, ShipmentStatus


class ShipmentResponse(ApiSchema):
    shipment_id: str
    consignee_name: str
    postal_code: str
    weight_grams: int
    status: ShipmentStatus
    carrier: Carrier | None
    dispatched_at: datetime | None
X
cat > app/shipping/get_shipment/handler.py <<'X'
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..adapters.orm import ShipmentRow
from ..domain import Carrier, ShipmentId, ShipmentNotFound, ShipmentStatus
from .schemas import ShipmentResponse


async def get_shipment(session: AsyncSession, shipment_id: ShipmentId) -> ShipmentResponse:
    query = select(
        ShipmentRow.id, ShipmentRow.consignee_name, ShipmentRow.postal_code, ShipmentRow.weight_grams,
        ShipmentRow.status, ShipmentRow.carrier, ShipmentRow.dispatched_at,
    ).where(ShipmentRow.id == shipment_id)
    row = (await session.execute(query)).one_or_none()
    if row is None:
        raise ShipmentNotFound(shipment_id)
    return ShipmentResponse(
        shipment_id=row.id,
        consignee_name=row.consignee_name,
        postal_code=row.postal_code,
        weight_grams=row.weight_grams,
        status=ShipmentStatus(row.status),
        carrier=Carrier(row.carrier) if row.carrier else None,
        dispatched_at=row.dispatched_at,
    )
X
cat > app/shipping/get_shipment/endpoint.py <<'X'
from fastapi import APIRouter

from app.shared.dependencies import Session
from app.shared.openapi import problem_response

from ..domain import ShipmentId
from . import handler
from .schemas import ShipmentResponse

router = APIRouter()


@router.get("/{shipment_id}", summary="Get a shipment", responses={404: problem_response("No such shipment")})
async def get_shipment(shipment_id: str, session: Session) -> ShipmentResponse:
    """Returns the shipment and, once it is dispatched, its carrier."""
    return await handler.get_shipment(session, ShipmentId(shipment_id))
X
cat > app/shipping/list_shipments/schemas.py <<'X'
from datetime import datetime

from app.shared.pagination import Page
from app.shared.schemas import ApiSchema

from ..domain import ShipmentStatus


class ShipmentSummary(ApiSchema):
    shipment_id: str
    consignee_name: str
    status: ShipmentStatus
    booked_at: datetime


class ShipmentPage(Page[ShipmentSummary]):
    pass
X
cat > app/shipping/list_shipments/handler.py <<'X'
from datetime import datetime

from sqlalchemy import select, tuple_
from sqlalchemy.ext.asyncio import AsyncSession

from app.shared.pagination import decode_cursor, encode_cursor

from ..adapters.orm import ShipmentRow
from ..domain import ShipmentStatus
from .schemas import ShipmentPage, ShipmentSummary


async def list_shipments(session: AsyncSession, limit: int, cursor: str | None) -> ShipmentPage:
    query = (
        select(ShipmentRow.id, ShipmentRow.consignee_name, ShipmentRow.status, ShipmentRow.booked_at)
        .order_by(ShipmentRow.booked_at.desc(), ShipmentRow.id.desc())
        .limit(limit + 1)
    )
    if cursor is not None:
        booked_at, shipment_id = decode_cursor(cursor)
        after = (datetime.fromisoformat(booked_at), shipment_id)
        query = query.where(tuple_(ShipmentRow.booked_at, ShipmentRow.id) < after)
    rows = (await session.execute(query)).all()
    page = rows[:limit]
    last = page[-1] if page else None
    return ShipmentPage(
        items=[
            ShipmentSummary(shipment_id=row.id, consignee_name=row.consignee_name, status=ShipmentStatus(row.status),
                            booked_at=row.booked_at)
            for row in page
        ],
        next_cursor=encode_cursor(last.booked_at.isoformat(), last.id) if last and len(rows) > limit else None,
    )
X
cat > app/shipping/list_shipments/endpoint.py <<'X'
from typing import Annotated

from fastapi import APIRouter, Query

from app.shared.dependencies import Session

from . import handler
from .schemas import ShipmentPage

router = APIRouter()


@router.get("", summary="List shipments, newest first")
async def list_shipments(
    session: Session, limit: Annotated[int, Query(ge=1, le=100)] = 20, cursor: str | None = None
) -> ShipmentPage:
    """Pages through every shipment, newest first. Pass a page's `nextCursor` as `cursor` to get the next."""
    return await handler.list_shipments(session, limit, cursor)
X
cat > app/shipping/dispatch_shipment/handler.py <<'X'
from dataclasses import dataclass

from app.shared.clock import Clock

from ..adapters.unit_of_work import ShippingUnitOfWork
from ..domain import Carrier, ShipmentId, ShipmentNotFound


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
X
cat > app/shipping/dispatch_shipment/schemas.py <<'X'
from pydantic import ConfigDict

from app.shared.schemas import ApiSchema

from ..domain import Carrier


class DispatchShipmentRequest(ApiSchema):
    model_config = ConfigDict(extra="forbid")

    carrier: Carrier
X
cat > app/shipping/dispatch_shipment/endpoint.py <<'X'
from fastapi import APIRouter, status

from app.shared.dependencies import AppClock
from app.shared.openapi import problem_response

from ..adapters.unit_of_work import ShippingUow
from ..domain import ShipmentId
from . import handler
from .schemas import DispatchShipmentRequest

router = APIRouter()


@router.post(
    "/{shipment_id}/dispatch",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Dispatch a shipment",
    responses={404: problem_response("No such shipment"), 409: problem_response("Already dispatched")},
)
async def dispatch_shipment(shipment_id: str, body: DispatchShipmentRequest, uow: ShippingUow, clock: AppClock) -> None:
    """Hands the shipment to its carrier. Dispatching is final: it cannot be cancelled afterwards."""
    await handler.dispatch_shipment(handler.DispatchShipment(ShipmentId(shipment_id), body.carrier), uow, clock)
X
for s in create_shipment get_shipment list_shipments dispatch_shipment; do
  printf 'from .endpoint import router\n\n__all__ = ["router"]\n' > app/shipping/$s/__init__.py
done
cat > app/shipping/__init__.py <<'X'
from fastapi import APIRouter

from .create_shipment import router as create_shipment_router
from .dispatch_shipment import router as dispatch_shipment_router
from .domain import ShipmentDispatched
from .get_shipment import router as get_shipment_router
from .list_shipments import router as list_shipments_router

router = APIRouter(tags=["shipments"])
router.include_router(create_shipment_router, prefix="/shipments")
router.include_router(list_shipments_router, prefix="/shipments")
router.include_router(get_shipment_router, prefix="/shipments")
router.include_router(dispatch_shipment_router, prefix="/shipments")

__all__ = ["ShipmentDispatched", "router"]
X

# ---------- billing: a quote only, no tables yet
cat > app/billing/domain/tariff.py <<'X'
BASE_PRICE_YEN = 800
PRICE_PER_KG_YEN = 120


def price_for(weight_grams: int) -> int:
    started_kilograms = -(-weight_grams // 1000)
    return BASE_PRICE_YEN + PRICE_PER_KG_YEN * max(started_kilograms - 1, 0)
X
printf 'from .tariff import price_for\n\n__all__ = ["price_for"]\n' > app/billing/domain/__init__.py
cat > app/billing/get_quote/handler.py <<'X'
from ..domain import price_for


def quote_price(weight_grams: int) -> int:
    return price_for(weight_grams)
X
cat > app/billing/get_quote/schemas.py <<'X'
from app.shared.schemas import ApiSchema


class QuoteResponse(ApiSchema):
    weight_grams: int
    price_yen: int
X
cat > app/billing/get_quote/endpoint.py <<'X'
from typing import Annotated

from fastapi import APIRouter, Query

from . import handler
from .schemas import QuoteResponse

router = APIRouter()


@router.get("", summary="Quote a shipping price")
async def get_quote(weight_grams: Annotated[int, Query(gt=0, le=30_000)]) -> QuoteResponse:
    """Quotes the price of a parcel of this weight, in yen including tax."""
    return QuoteResponse(weight_grams=weight_grams, price_yen=handler.quote_price(weight_grams))
X
printf 'from .endpoint import router\nfrom .handler import quote_price\n\n__all__ = ["quote_price", "router"]\n' > app/billing/get_quote/__init__.py
cat > app/billing/__init__.py <<'X'
from fastapi import APIRouter

from .get_quote import quote_price
from .get_quote import router as get_quote_router

router = APIRouter(tags=["billing"])
router.include_router(get_quote_router, prefix="/quotes")

__all__ = ["quote_price", "router"]
X

# ---------- health
cat > app/health/check_liveness/endpoint.py <<'X'
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()


class LivenessResponse(BaseModel):
    status: str


@router.get("/health", summary="Liveness")
async def check_liveness() -> LivenessResponse:
    """Answers while the process can serve requests. It touches nothing else."""
    return LivenessResponse(status="ok")
X
cat > app/health/check_readiness/handler.py <<'X'
import asyncio

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

TIMEOUT_SECONDS = 2


async def database_is_ready(session_factory: async_sessionmaker[AsyncSession]) -> bool:
    try:
        async with asyncio.timeout(TIMEOUT_SECONDS), session_factory() as session:
            await session.execute(text("SELECT 1"))
    except Exception:
        return False
    return True
X
cat > app/health/check_readiness/endpoint.py <<'X'
from fastapi import APIRouter, Response, status
from pydantic import BaseModel

from app.shared.dependencies import SessionFactory

from . import handler

router = APIRouter()


class ReadinessResponse(BaseModel):
    status: str
    database: str


@router.get("/health/ready", summary="Readiness", responses={503: {"model": ReadinessResponse}})
async def check_readiness(response: Response, session_factory: SessionFactory) -> ReadinessResponse:
    """Answers 503 until the database answers, so the load balancer holds traffic back."""
    if await handler.database_is_ready(session_factory):
        return ReadinessResponse(status="ok", database="ok")
    response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    return ReadinessResponse(status="unavailable", database="unavailable")
X
for s in check_liveness check_readiness; do
  printf 'from .endpoint import router\n\n__all__ = ["router"]\n' > app/health/$s/__init__.py
done
cat > app/health/__init__.py <<'X'
from fastapi import APIRouter

from .check_liveness import router as check_liveness_router
from .check_readiness import router as check_readiness_router

router = APIRouter(tags=["health"])
router.include_router(check_liveness_router)
router.include_router(check_readiness_router)

__all__ = ["router"]
X

# ---------- migrations and scripts
cat > alembic.ini <<'X'
[alembic]
script_location = migrations
X
cat > migrations/env.py <<'X'
import asyncio

from alembic import context
from sqlalchemy import Connection
from sqlalchemy.ext.asyncio import create_async_engine

import app.shipping.adapters.orm  # noqa: F401  registers the tables on Base.metadata
from app.shared.db import Base
from app.shared.settings import Settings


def run(connection: Connection) -> None:
    context.configure(connection=connection, target_metadata=Base.metadata)
    with context.begin_transaction():
        context.run_migrations()


async def main() -> None:
    engine = create_async_engine(Settings().database_url)
    async with engine.connect() as connection:
        await connection.run_sync(run)
    await engine.dispose()


asyncio.run(main())
X
cat > migrations/versions/0001_create_shipments.py <<'X'
"""Create shipments."""

import sqlalchemy as sa
from alembic import op

revision = "0001"
down_revision = None


def upgrade() -> None:
    op.create_table(
        "shipments",
        sa.Column("id", sa.String(32), primary_key=True),
        sa.Column("consignee_name", sa.String(200), nullable=False),
        sa.Column("postal_code", sa.String(8), nullable=False),
        sa.Column("weight_grams", sa.Integer, nullable=False),
        sa.Column("status", sa.String(16), nullable=False),
        sa.Column("carrier", sa.String(16)),
        sa.Column("booked_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("dispatched_at", sa.DateTime(timezone=True)),
        sa.Column("delivered_at", sa.DateTime(timezone=True)),
        sa.Column("version", sa.Integer, nullable=False),
    )
    op.create_index("ix_shipments_booked_at_id", "shipments", ["booked_at", "id"])


def downgrade() -> None:
    op.drop_table("shipments")
X
cat > scripts/export_openapi.py <<'X'
import json
from pathlib import Path

from app.main import create_app
from app.shared.settings import Settings

SPEC_PATH = Path(__file__).resolve().parents[1] / "openapi.json"


def main() -> None:
    SPEC_PATH.write_text(json.dumps(create_app(Settings()).openapi(), indent=2, ensure_ascii=False) + "\n")


if __name__ == "__main__":
    main()
X

# ---------- tests
cat > tests/fakes.py <<'X'
from collections.abc import Iterable
from datetime import UTC, datetime
from typing import Self

from app.shipping.domain import Consignee, Pending, Shipment, ShipmentId, ShipmentState

BOOKED_AT = datetime(2026, 10, 26, 9, 0, tzinfo=UTC)


def build_shipment(state: ShipmentState | None = None, weight_grams: int = 1200) -> Shipment:
    consignee = Consignee("Aiko Sato", "150-0002")
    return Shipment(ShipmentId("sh_000000000001"), consignee, weight_grams, BOOKED_AT, state or Pending())


class FakeShipmentRepository:
    def __init__(self, shipments: Iterable[Shipment] = ()) -> None:
        self._shipments = {shipment.id: shipment for shipment in shipments}
        self.seen: set[Shipment] = set()

    async def get(self, shipment_id: ShipmentId) -> Shipment | None:
        shipment = self._shipments.get(shipment_id)
        if shipment is not None:
            self.seen.add(shipment)
        return shipment

    def add(self, shipment: Shipment) -> None:
        self._shipments[shipment.id] = shipment
        self.seen.add(shipment)

    def collect_events(self) -> list[object]:
        events = [event for shipment in self.seen for event in shipment.events]
        for shipment in self.seen:
            shipment.events.clear()
        return events


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
X
cat > tests/conftest.py <<'X'
from datetime import UTC, datetime

import pytest

from app.shared.clock import Clock

NOW = datetime(2026, 10, 27, 9, 0, tzinfo=UTC)


@pytest.fixture
def clock() -> Clock:
    return lambda: NOW
X
cat > tests/shipping/test_dispatch_shipment.py <<'X'
import pytest

from app.shared.clock import Clock
from app.shipping.dispatch_shipment.handler import DispatchShipment, dispatch_shipment
from app.shipping.domain import (
    Carrier,
    Dispatched,
    ShipmentAlreadyDispatched,
    ShipmentDispatched,
    ShipmentId,
    ShipmentNotFound,
)
from tests.fakes import FakeShippingUnitOfWork, build_shipment


async def test_dispatch_hands_the_shipment_to_the_carrier(clock: Clock) -> None:
    shipment = build_shipment()
    uow = FakeShippingUnitOfWork([shipment])

    await dispatch_shipment(DispatchShipment(shipment.id, Carrier.YAMATO), uow, clock)

    assert shipment.state == Dispatched(Carrier.YAMATO, clock())
    assert uow.committed
    assert uow.published == [ShipmentDispatched(shipment.id, Carrier.YAMATO, clock())]


async def test_dispatch_raises_when_shipment_already_dispatched(clock: Clock) -> None:
    shipment = build_shipment(Dispatched(Carrier.SAGAWA, clock()))
    uow = FakeShippingUnitOfWork([shipment])

    with pytest.raises(ShipmentAlreadyDispatched):
        await dispatch_shipment(DispatchShipment(shipment.id, Carrier.YAMATO), uow, clock)
    assert not uow.committed


async def test_dispatch_raises_when_shipment_does_not_exist(clock: Clock) -> None:
    command = DispatchShipment(ShipmentId("sh_none"), Carrier.YAMATO)

    with pytest.raises(ShipmentNotFound):
        await dispatch_shipment(command, FakeShippingUnitOfWork(), clock)
X
cat > tests/shipping/test_create_shipment.py <<'X'
from httpx import ASGITransport, AsyncClient

from app.main import create_app
from app.shared.clock import Clock
from app.shared.dependencies import get_clock
from app.shared.settings import Settings
from app.shipping.adapters.unit_of_work import get_shipping_uow
from tests.fakes import FakeShippingUnitOfWork


async def test_create_answers_201_with_the_new_shipment_location(clock: Clock) -> None:
    app = create_app(Settings())
    uow = FakeShippingUnitOfWork()
    app.dependency_overrides[get_shipping_uow] = lambda: uow
    app.dependency_overrides[get_clock] = lambda: clock

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post(
            "/api/v1/shipments", json={"consigneeName": "Aiko Sato", "postalCode": "150-0002", "weightGrams": 1200}
        )

    assert response.status_code == 201
    assert response.headers["location"] == f"/api/v1/shipments/{response.json()['shipmentId']}"
    assert uow.committed


async def test_create_answers_a_problem_when_postal_code_is_invalid(clock: Clock) -> None:
    app = create_app(Settings())
    app.dependency_overrides[get_shipping_uow] = lambda: FakeShippingUnitOfWork()
    app.dependency_overrides[get_clock] = lambda: clock

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post(
            "/api/v1/shipments", json={"consigneeName": "Aiko Sato", "postalCode": "1500002", "weightGrams": 1200}
        )

    assert response.status_code == 422
    assert response.headers["content-type"] == "application/problem+json"
    assert response.json()["type"].endswith("/invalid-postal-code")
X
cat > tests/test_openapi.py <<'X'
import json
import warnings
from pathlib import Path

from app.main import create_app
from app.shared.settings import Settings

SPEC_PATH = Path(__file__).resolve().parents[1] / "openapi.json"


def test_openapi_spec_is_current() -> None:
    with warnings.catch_warnings():
        warnings.simplefilter("error")
        spec = create_app(Settings()).openapi()
    assert spec == json.loads(SPEC_PATH.read_text()), "openapi.json is stale: run python -m scripts.export_openapi"
X
cat > tests/billing/test_tariff.py <<'X'
from app.billing.domain import price_for


def test_price_adds_a_rate_per_started_kilogram_after_the_first() -> None:
    assert price_for(2500) == 800 + 2 * 120
X
cat > .gitignore <<'X'
.venv/
__pycache__/
X


# Written by scripts/export_openapi.py from the app above.
cat > openapi.json <<'X'
{
  "openapi": "3.1.0",
  "info": {
    "title": "Shipping API",
    "version": "1.0.0"
  },
  "paths": {
    "/api/v1/shipments": {
      "post": {
        "tags": [
          "shipments"
        ],
        "summary": "Book a shipment",
        "description": "Books a shipment for the consignee. It stays pending until it is dispatched.",
        "operationId": "create_shipment",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/CreateShipmentRequest"
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "Successful Response",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/CreatedShipmentResponse"
                }
              }
            }
          },
          "422": {
            "description": "The request is malformed or invalid",
            "content": {
              "application/problem+json": {
                "schema": {
                  "$ref": "#/components/schemas/Problem"
                }
              }
            }
          }
        }
      },
      "get": {
        "tags": [
          "shipments"
        ],
        "summary": "List shipments, newest first",
        "description": "Pages through every shipment, newest first. Pass a page's `nextCursor` as `cursor` to get the next.",
        "operationId": "list_shipments",
        "parameters": [
          {
            "name": "limit",
            "in": "query",
            "required": false,
            "schema": {
              "type": "integer",
              "maximum": 100,
              "minimum": 1,
              "default": 20,
              "title": "Limit"
            }
          },
          {
            "name": "cursor",
            "in": "query",
            "required": false,
            "schema": {
              "anyOf": [
                {
                  "type": "string"
                },
                {
                  "type": "null"
                }
              ],
              "title": "Cursor"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Successful Response",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ShipmentPage"
                }
              }
            }
          },
          "422": {
            "description": "The request is malformed or invalid",
            "content": {
              "application/problem+json": {
                "schema": {
                  "$ref": "#/components/schemas/Problem"
                }
              }
            }
          }
        }
      }
    },
    "/api/v1/shipments/{shipment_id}": {
      "get": {
        "tags": [
          "shipments"
        ],
        "summary": "Get a shipment",
        "description": "Returns the shipment and, once it is dispatched, its carrier.",
        "operationId": "get_shipment",
        "parameters": [
          {
            "name": "shipment_id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string",
              "title": "Shipment Id"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Successful Response",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ShipmentResponse"
                }
              }
            }
          },
          "422": {
            "description": "The request is malformed or invalid",
            "content": {
              "application/problem+json": {
                "schema": {
                  "$ref": "#/components/schemas/Problem"
                }
              }
            }
          },
          "404": {
            "description": "No such shipment",
            "content": {
              "application/problem+json": {
                "schema": {
                  "$ref": "#/components/schemas/Problem"
                }
              }
            }
          }
        }
      }
    },
    "/api/v1/shipments/{shipment_id}/dispatch": {
      "post": {
        "tags": [
          "shipments"
        ],
        "summary": "Dispatch a shipment",
        "description": "Hands the shipment to its carrier. Dispatching is final: it cannot be cancelled afterwards.",
        "operationId": "dispatch_shipment",
        "parameters": [
          {
            "name": "shipment_id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string",
              "title": "Shipment Id"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/DispatchShipmentRequest"
              }
            }
          }
        },
        "responses": {
          "204": {
            "description": "Successful Response"
          },
          "422": {
            "description": "The request is malformed or invalid",
            "content": {
              "application/problem+json": {
                "schema": {
                  "$ref": "#/components/schemas/Problem"
                }
              }
            }
          },
          "404": {
            "description": "No such shipment",
            "content": {
              "application/problem+json": {
                "schema": {
                  "$ref": "#/components/schemas/Problem"
                }
              }
            }
          },
          "409": {
            "description": "Already dispatched",
            "content": {
              "application/problem+json": {
                "schema": {
                  "$ref": "#/components/schemas/Problem"
                }
              }
            }
          }
        }
      }
    },
    "/api/v1/quotes": {
      "get": {
        "tags": [
          "billing"
        ],
        "summary": "Quote a shipping price",
        "description": "Quotes the price of a parcel of this weight, in yen including tax.",
        "operationId": "get_quote",
        "parameters": [
          {
            "name": "weight_grams",
            "in": "query",
            "required": true,
            "schema": {
              "type": "integer",
              "maximum": 30000,
              "exclusiveMinimum": 0,
              "title": "Weight Grams"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Successful Response",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/QuoteResponse"
                }
              }
            }
          },
          "422": {
            "description": "The request is malformed or invalid",
            "content": {
              "application/problem+json": {
                "schema": {
                  "$ref": "#/components/schemas/Problem"
                }
              }
            }
          }
        }
      }
    },
    "/health": {
      "get": {
        "tags": [
          "health"
        ],
        "summary": "Liveness",
        "description": "Answers while the process can serve requests. It touches nothing else.",
        "operationId": "check_liveness",
        "responses": {
          "200": {
            "description": "Successful Response",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/LivenessResponse"
                }
              }
            }
          },
          "422": {
            "description": "The request is malformed or invalid",
            "content": {
              "application/problem+json": {
                "schema": {
                  "$ref": "#/components/schemas/Problem"
                }
              }
            }
          }
        }
      }
    },
    "/health/ready": {
      "get": {
        "tags": [
          "health"
        ],
        "summary": "Readiness",
        "description": "Answers 503 until the database answers, so the load balancer holds traffic back.",
        "operationId": "check_readiness",
        "responses": {
          "200": {
            "description": "Successful Response",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ReadinessResponse"
                }
              }
            }
          },
          "422": {
            "description": "The request is malformed or invalid",
            "content": {
              "application/problem+json": {
                "schema": {
                  "$ref": "#/components/schemas/Problem"
                }
              }
            }
          },
          "503": {
            "description": "Service Unavailable",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ReadinessResponse"
                }
              }
            }
          }
        }
      }
    }
  },
  "components": {
    "schemas": {
      "Carrier": {
        "type": "string",
        "enum": [
          "yamato",
          "sagawa",
          "japan_post"
        ],
        "title": "Carrier"
      },
      "CreateShipmentRequest": {
        "properties": {
          "consigneeName": {
            "type": "string",
            "maxLength": 200,
            "minLength": 1,
            "title": "Consigneename"
          },
          "postalCode": {
            "type": "string",
            "title": "Postalcode",
            "description": "A Japanese postal code",
            "examples": [
              "150-0002"
            ]
          },
          "weightGrams": {
            "type": "integer",
            "maximum": 30000.0,
            "exclusiveMinimum": 0.0,
            "title": "Weightgrams"
          }
        },
        "additionalProperties": false,
        "type": "object",
        "required": [
          "consigneeName",
          "postalCode",
          "weightGrams"
        ],
        "title": "CreateShipmentRequest"
      },
      "CreatedShipmentResponse": {
        "properties": {
          "shipmentId": {
            "type": "string",
            "title": "Shipmentid"
          }
        },
        "type": "object",
        "required": [
          "shipmentId"
        ],
        "title": "CreatedShipmentResponse"
      },
      "DispatchShipmentRequest": {
        "properties": {
          "carrier": {
            "$ref": "#/components/schemas/Carrier"
          }
        },
        "additionalProperties": false,
        "type": "object",
        "required": [
          "carrier"
        ],
        "title": "DispatchShipmentRequest"
      },
      "LivenessResponse": {
        "properties": {
          "status": {
            "type": "string",
            "title": "Status"
          }
        },
        "type": "object",
        "required": [
          "status"
        ],
        "title": "LivenessResponse"
      },
      "QuoteResponse": {
        "properties": {
          "weightGrams": {
            "type": "integer",
            "title": "Weightgrams"
          },
          "priceYen": {
            "type": "integer",
            "title": "Priceyen"
          }
        },
        "type": "object",
        "required": [
          "weightGrams",
          "priceYen"
        ],
        "title": "QuoteResponse"
      },
      "ReadinessResponse": {
        "properties": {
          "status": {
            "type": "string",
            "title": "Status"
          },
          "database": {
            "type": "string",
            "title": "Database"
          }
        },
        "type": "object",
        "required": [
          "status",
          "database"
        ],
        "title": "ReadinessResponse"
      },
      "ShipmentPage": {
        "properties": {
          "items": {
            "items": {
              "$ref": "#/components/schemas/ShipmentSummary"
            },
            "type": "array",
            "title": "Items"
          },
          "nextCursor": {
            "anyOf": [
              {
                "type": "string"
              },
              {
                "type": "null"
              }
            ],
            "title": "Nextcursor"
          }
        },
        "type": "object",
        "required": [
          "items",
          "nextCursor"
        ],
        "title": "ShipmentPage"
      },
      "ShipmentResponse": {
        "properties": {
          "shipmentId": {
            "type": "string",
            "title": "Shipmentid"
          },
          "consigneeName": {
            "type": "string",
            "title": "Consigneename"
          },
          "postalCode": {
            "type": "string",
            "title": "Postalcode"
          },
          "weightGrams": {
            "type": "integer",
            "title": "Weightgrams"
          },
          "status": {
            "$ref": "#/components/schemas/ShipmentStatus"
          },
          "carrier": {
            "anyOf": [
              {
                "$ref": "#/components/schemas/Carrier"
              },
              {
                "type": "null"
              }
            ]
          },
          "dispatchedAt": {
            "anyOf": [
              {
                "type": "string",
                "format": "date-time"
              },
              {
                "type": "null"
              }
            ],
            "title": "Dispatchedat"
          }
        },
        "type": "object",
        "required": [
          "shipmentId",
          "consigneeName",
          "postalCode",
          "weightGrams",
          "status",
          "carrier",
          "dispatchedAt"
        ],
        "title": "ShipmentResponse"
      },
      "ShipmentStatus": {
        "type": "string",
        "enum": [
          "pending",
          "dispatched",
          "delivered"
        ],
        "title": "ShipmentStatus"
      },
      "ShipmentSummary": {
        "properties": {
          "shipmentId": {
            "type": "string",
            "title": "Shipmentid"
          },
          "consigneeName": {
            "type": "string",
            "title": "Consigneename"
          },
          "status": {
            "$ref": "#/components/schemas/ShipmentStatus"
          },
          "bookedAt": {
            "type": "string",
            "format": "date-time",
            "title": "Bookedat"
          }
        },
        "type": "object",
        "required": [
          "shipmentId",
          "consigneeName",
          "status",
          "bookedAt"
        ],
        "title": "ShipmentSummary"
      },
      "Problem": {
        "properties": {
          "type": {
            "title": "Type",
            "type": "string"
          },
          "title": {
            "title": "Title",
            "type": "string"
          },
          "status": {
            "title": "Status",
            "type": "integer"
          },
          "detail": {
            "anyOf": [
              {
                "type": "string"
              },
              {
                "type": "null"
              }
            ],
            "default": null,
            "title": "Detail"
          },
          "instance": {
            "anyOf": [
              {
                "type": "string"
              },
              {
                "type": "null"
              }
            ],
            "default": null,
            "title": "Instance"
          },
          "errors": {
            "anyOf": [
              {
                "items": {
                  "additionalProperties": {
                    "type": "string"
                  },
                  "type": "object"
                },
                "type": "array"
              },
              {
                "type": "null"
              }
            ],
            "default": null,
            "title": "Errors"
          }
        },
        "required": [
          "type",
          "title",
          "status"
        ],
        "title": "Problem",
        "type": "object"
      }
    }
  }
}
X
