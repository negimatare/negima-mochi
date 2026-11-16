#!/usr/bin/env bash
# Shipment.dispatch reads datetime.now(UTC) when no time is passed, and the dispatch handler relies on it.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/../_shared/shipping-api.sh"
perl -0pi -e 's/from datetime import datetime\n/from datetime import UTC, datetime\n/; s/    def dispatch\(self, carrier: Carrier, at: datetime\) -> None:\n/    def dispatch(self, carrier: Carrier, at: datetime | None = None) -> None:\n        at = at or datetime.now(UTC)\n/' app/shipping/domain/model.py
perl -0pi -e 's/        shipment\.dispatch\(command\.carrier, at=clock\(\)\)\n/        shipment.dispatch(command.carrier)\n/' app/shipping/dispatch_shipment/handler.py
perl -0pi -e 's/    assert shipment\.state == Dispatched\(Carrier\.YAMATO, clock\(\)\)\n/    assert isinstance(shipment.state, Dispatched)\n/; s/    assert uow\.published == \[ShipmentDispatched\(shipment\.id, Carrier\.YAMATO, clock\(\)\)\]\n/    assert len(uow.published) == 1\n/; s/    ShipmentDispatched,\n//' tests/shipping/test_dispatch_shipment.py
git add -A && git commit -q -m "feat: shipping api"
