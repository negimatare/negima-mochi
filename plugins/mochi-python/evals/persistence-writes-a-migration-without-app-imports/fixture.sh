#!/usr/bin/env bash
# The first migration creates its table from ShipmentRow.__table__, a neighbour that imports the app into a migration.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/../_shared/shipping-api.sh"
cat > migrations/versions/0001_create_shipments.py <<'Y'
"""Create shipments."""

from alembic import op

from app.shipping.adapters.orm import ShipmentRow

revision = "0001"
down_revision = None


def upgrade() -> None:
    ShipmentRow.__table__.create(op.get_bind())


def downgrade() -> None:
    ShipmentRow.__table__.drop(op.get_bind())
Y
git add -A && git commit -q -m "feat: shipping api"
