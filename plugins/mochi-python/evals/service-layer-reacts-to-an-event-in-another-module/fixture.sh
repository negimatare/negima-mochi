#!/usr/bin/env bash
# create_shipment calls billing's charge_booking_fee after commit, a neighbour that makes a side effect in another module a direct call.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/../_shared/shipping-api.sh"
mkdir -p app/billing/charge_booking
cat > app/billing/charge_booking/handler.py <<'Y'
import logging

from ..domain import price_for

logger = logging.getLogger(__name__)


async def charge_booking_fee(shipment_id: str, weight_grams: int) -> None:
    logger.info("Booking fee charged", extra={"shipment_id": shipment_id, "price_yen": price_for(weight_grams)})
Y
printf 'from .handler import charge_booking_fee\n\n__all__ = ["charge_booking_fee"]\n' > app/billing/charge_booking/__init__.py
cat > app/billing/__init__.py <<'Y'
from fastapi import APIRouter

from .charge_booking import charge_booking_fee
from .get_quote import quote_price
from .get_quote import router as get_quote_router

router = APIRouter(tags=["billing"])
router.include_router(get_quote_router, prefix="/quotes")

__all__ = ["charge_booking_fee", "quote_price", "router"]
Y
perl -0pi -e 's/    "get_quote",\n/    "get_quote | charge_booking",\n/' pyproject.toml
cat > app/shipping/create_shipment/handler.py <<'Y'
from dataclasses import dataclass

from app.billing import charge_booking_fee
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
    await charge_booking_fee(shipment.id, shipment.weight_grams)
    return shipment.id
Y
git add -A && git commit -q -m "feat: shipping api"
