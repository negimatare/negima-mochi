#!/usr/bin/env bash
# list_shipments prices each row with app.billing.domain.tariff, a neighbour that skips billing's public API.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/../_shared/shipping-api.sh"
perl -0pi -e 's/from app\.shared\.pagination import decode_cursor, encode_cursor\n/from app.billing.domain.tariff import price_for\nfrom app.shared.pagination import decode_cursor, encode_cursor\n/; s/ShipmentRow\.status, ShipmentRow\.booked_at\)/ShipmentRow.status, ShipmentRow.booked_at,\n               ShipmentRow.weight_grams)/; s/booked_at=row\.booked_at\)/booked_at=row.booked_at, price_yen=price_for(row.weight_grams))/' app/shipping/list_shipments/handler.py
perl -0pi -e 's/    booked_at: datetime\n/    booked_at: datetime\n    price_yen: int\n/' app/shipping/list_shipments/schemas.py
git add -A && git commit -q -m "feat: shipping api"
