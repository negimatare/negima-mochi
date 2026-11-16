#!/usr/bin/env bash
# The dispatch route has no summary, docstring, or documented errors, a neighbour that leaves the spec bare.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/../_shared/shipping-api.sh"
cat > app/shipping/dispatch_shipment/endpoint.py <<'Y'
from fastapi import APIRouter, status

from app.shared.dependencies import AppClock

from ..adapters.unit_of_work import ShippingUow
from ..domain import ShipmentId
from . import handler
from .schemas import DispatchShipmentRequest

router = APIRouter()


@router.post("/{shipment_id}/dispatch", status_code=status.HTTP_204_NO_CONTENT)
async def dispatch_shipment(shipment_id: str, body: DispatchShipmentRequest, uow: ShippingUow, clock: AppClock) -> None:
    await handler.dispatch_shipment(handler.DispatchShipment(ShipmentId(shipment_id), body.carrier), uow, clock)
Y
git add -A && git commit -q -m "feat: shipping api"
