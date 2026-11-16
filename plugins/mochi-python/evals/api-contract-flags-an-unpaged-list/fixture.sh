#!/usr/bin/env bash
# list_shipments selects every shipment with no limit or cursor and returns a bare list.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/../_shared/shipping-api.sh"
cat > app/shipping/list_shipments/schemas.py <<'Y'
from datetime import datetime

from app.shared.schemas import ApiSchema

from ..domain import ShipmentStatus


class ShipmentSummary(ApiSchema):
    shipment_id: str
    consignee_name: str
    status: ShipmentStatus
    booked_at: datetime
Y
cat > app/shipping/list_shipments/handler.py <<'Y'
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..adapters.orm import ShipmentRow
from ..domain import ShipmentStatus
from .schemas import ShipmentSummary


async def list_shipments(session: AsyncSession) -> list[ShipmentSummary]:
    query = select(ShipmentRow.id, ShipmentRow.consignee_name, ShipmentRow.status, ShipmentRow.booked_at).order_by(
        ShipmentRow.booked_at.desc()
    )
    rows = (await session.execute(query)).all()
    return [
        ShipmentSummary(shipment_id=row.id, consignee_name=row.consignee_name, status=ShipmentStatus(row.status),
                        booked_at=row.booked_at)
        for row in rows
    ]
Y
cat > app/shipping/list_shipments/endpoint.py <<'Y'
from fastapi import APIRouter

from app.shared.dependencies import Session

from . import handler
from .schemas import ShipmentSummary

router = APIRouter()


@router.get("", summary="List shipments, newest first")
async def list_shipments(session: Session) -> list[ShipmentSummary]:
    """Lists every shipment, newest first."""
    return await handler.list_shipments(session)
Y
python3 -I - <<'PY'
import json, pathlib
path = pathlib.Path("openapi.json")
spec = json.loads(path.read_text())
get = spec["paths"]["/api/v1/shipments"]["get"]
get.pop("parameters", None)
get["description"] = "Lists every shipment, newest first."
schema = {"type": "array", "items": {"$ref": "#/components/schemas/ShipmentSummary"}, "title": "Response List Shipments"}
get["responses"]["200"]["content"]["application/json"]["schema"] = schema
del spec["components"]["schemas"]["ShipmentPage"]
path.write_text(json.dumps(spec, indent=2, ensure_ascii=False) + "\n")
PY
git add -A && git commit -q -m "feat: shipping api"
