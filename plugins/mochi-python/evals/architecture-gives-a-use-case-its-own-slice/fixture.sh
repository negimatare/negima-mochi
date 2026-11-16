#!/usr/bin/env bash
# The dispatch slice also serves GET .../dispatch, a neighbour that puts two use cases in one slice.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/../_shared/shipping-api.sh"
cat > app/shipping/dispatch_shipment/schemas.py <<'Y'
from datetime import datetime

from pydantic import ConfigDict

from app.shared.schemas import ApiSchema

from ..domain import Carrier


class DispatchShipmentRequest(ApiSchema):
    model_config = ConfigDict(extra="forbid")

    carrier: Carrier


class DispatchResponse(ApiSchema):
    carrier: Carrier
    dispatched_at: datetime
Y
cat > app/shipping/dispatch_shipment/endpoint.py <<'Y'
from fastapi import APIRouter, status
from sqlalchemy import select

from app.shared.dependencies import AppClock, Session
from app.shared.openapi import problem_response

from ..adapters.orm import ShipmentRow
from ..adapters.unit_of_work import ShippingUow
from ..domain import Carrier, ShipmentId, ShipmentNotFound
from . import handler
from .schemas import DispatchResponse, DispatchShipmentRequest

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


@router.get(
    "/{shipment_id}/dispatch", summary="Get a shipment's dispatch", responses={404: problem_response("Not dispatched")}
)
async def get_dispatch(shipment_id: str, session: Session) -> DispatchResponse:
    """Returns the carrier and the time the shipment was dispatched."""
    query = select(ShipmentRow.carrier, ShipmentRow.dispatched_at).where(ShipmentRow.id == shipment_id)
    row = (await session.execute(query)).one_or_none()
    if row is None or row.carrier is None or row.dispatched_at is None:
        raise ShipmentNotFound(shipment_id)
    return DispatchResponse(carrier=Carrier(row.carrier), dispatched_at=row.dispatched_at)
Y
git add -A && git commit -q -m "feat: shipping api"
