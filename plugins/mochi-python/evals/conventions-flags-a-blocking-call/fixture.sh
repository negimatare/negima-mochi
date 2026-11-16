#!/usr/bin/env bash
# The carrier client uses requests with no timeout, and the async dispatch handler calls it.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/../_shared/shipping-api.sh"
perl -0pi -e 's/    "pydantic-settings>=2.10",\n/    "pydantic-settings>=2.10",\n    "requests>=2.32",\n/' pyproject.toml
cat > app/shipping/adapters/carrier_client.py <<'Y'
import requests

from ..domain import Carrier, ShipmentId

PICKUP_URL = "https://carriers.example/{carrier}/pickups"


def book_pickup(carrier: Carrier, shipment_id: ShipmentId) -> str:
    response = requests.post(PICKUP_URL.format(carrier=carrier), json={"reference": shipment_id})
    response.raise_for_status()
    return response.json()["pickupId"]
Y
cat > app/shipping/dispatch_shipment/handler.py <<'Y'
from dataclasses import dataclass

from app.shared.clock import Clock

from ..adapters.carrier_client import book_pickup
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
        book_pickup(command.carrier, shipment.id)
        shipment.dispatch(command.carrier, at=clock())
        await uow.commit()
Y
git add -A && git commit -q -m "feat: shipping api"
