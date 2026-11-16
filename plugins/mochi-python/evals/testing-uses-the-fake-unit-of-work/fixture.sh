#!/usr/bin/env bash
# The dispatch tests are gone and the create tests mock the unit of work and patch Shipment.book, a neighbour to copy.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/../_shared/shipping-api.sh"
rm tests/shipping/test_dispatch_shipment.py
cat > tests/shipping/test_create_shipment.py <<'Y'
from unittest.mock import AsyncMock, MagicMock, patch

from app.shipping.create_shipment.handler import CreateShipment, create_shipment


async def test_create_shipment() -> None:
    uow = MagicMock()
    uow.__aenter__ = AsyncMock(return_value=uow)
    uow.__aexit__ = AsyncMock(return_value=None)
    uow.commit = AsyncMock()
    with patch("app.shipping.create_shipment.handler.Shipment.book") as book:
        book.return_value.id = "sh_1"
        result = await create_shipment(CreateShipment("Aiko Sato", "150-0002", 1200), uow, MagicMock())
    uow.shipments.add.assert_called_once_with(book.return_value)
    uow.commit.assert_awaited_once()
    assert result == "sh_1"
Y
git add -A && git commit -q -m "feat: shipping api"
