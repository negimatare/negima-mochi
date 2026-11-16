#!/usr/bin/env bash
# create_shipment books with datetime.now(UTC) instead of its clock, a neighbour that reads the wall clock.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/../_shared/shipping-api.sh"
cat > app/shipping/create_shipment/handler.py <<'Y'
from dataclasses import dataclass
from datetime import UTC, datetime

from ..adapters.unit_of_work import ShippingUnitOfWork
from ..domain import Consignee, Shipment, ShipmentId


@dataclass(frozen=True)
class CreateShipment:
    consignee_name: str
    postal_code: str
    weight_grams: int


async def create_shipment(command: CreateShipment, uow: ShippingUnitOfWork) -> ShipmentId:
    consignee = Consignee(command.consignee_name, command.postal_code)
    shipment = Shipment.book(consignee, command.weight_grams, at=datetime.now(UTC))
    async with uow:
        uow.shipments.add(shipment)
        await uow.commit()
    return shipment.id
Y
perl -0pi -e 's/from app\.shared\.dependencies import AppClock\n\n//; s/, uow: ShippingUow, clock: AppClock\n/, uow: ShippingUow\n/; s/handler\.create_shipment\(command, uow, clock\)/handler.create_shipment(command, uow)/' app/shipping/create_shipment/endpoint.py
git add -A && git commit -q -m "feat: shipping api"
