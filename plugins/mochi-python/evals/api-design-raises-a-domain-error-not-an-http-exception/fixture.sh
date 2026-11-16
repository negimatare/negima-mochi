#!/usr/bin/env bash
# get_shipment's endpoint raises HTTPException(404) itself, a neighbour that builds its own error.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/../_shared/shipping-api.sh"
perl -0pi -e 's/async def get_shipment\(session: AsyncSession, shipment_id: ShipmentId\) -> ShipmentResponse:/async def get_shipment(session: AsyncSession, shipment_id: ShipmentId) -> ShipmentResponse | None:/; s/        raise ShipmentNotFound\(shipment_id\)/        return None/; s/ShipmentId, ShipmentNotFound, ShipmentStatus/ShipmentId, ShipmentStatus/' app/shipping/get_shipment/handler.py
cat > app/shipping/get_shipment/endpoint.py <<'Y'
from fastapi import APIRouter, HTTPException

from app.shared.dependencies import Session
from app.shared.openapi import problem_response

from ..domain import ShipmentId
from . import handler
from .schemas import ShipmentResponse

router = APIRouter()


@router.get("/{shipment_id}", summary="Get a shipment", responses={404: problem_response("No such shipment")})
async def get_shipment(shipment_id: str, session: Session) -> ShipmentResponse:
    """Returns the shipment and, once it is dispatched, its carrier."""
    shipment = await handler.get_shipment(session, ShipmentId(shipment_id))
    if shipment is None:
        raise HTTPException(status_code=404, detail="Shipment not found")
    return shipment
Y
git add -A && git commit -q -m "feat: shipping api"
