#!/usr/bin/env bash
# The dispatch handler checks Sagawa's Sunday closure itself, a neighbour that keeps a rule out of the domain.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/../_shared/shipping-api.sh"
cat >> app/shipping/domain/exceptions.py <<'Y'


class CarrierClosed(Conflict):
    type = "carrier-closed"
    title = "Carrier closed"
Y
perl -0pi -e 's/from \.exceptions import InvalidPostalCode, ShipmentAlreadyDispatched, ShipmentChangedConcurrently, ShipmentNotFound\n/from .exceptions import (\n    CarrierClosed,\n    InvalidPostalCode,\n    ShipmentAlreadyDispatched,\n    ShipmentChangedConcurrently,\n    ShipmentNotFound,\n)\n/; s/    "Carrier",\n/    "Carrier",\n    "CarrierClosed",\n/' app/shipping/domain/__init__.py
perl -0pi -e 's/from \.\.domain import Carrier, ShipmentId, ShipmentNotFound/from ..domain import Carrier, CarrierClosed, ShipmentId, ShipmentNotFound/; s/(            raise ShipmentNotFound\(command\.shipment_id\)\n)/$1        if command.carrier is Carrier.SAGAWA and clock().weekday() == 6:\n            raise CarrierClosed("Sagawa does not collect on Sundays.")\n/' app/shipping/dispatch_shipment/handler.py
git add -A && git commit -q -m "feat: shipping api"
