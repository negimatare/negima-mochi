#!/usr/bin/env bash
# ShipmentRow.labels is a relationship with the default lazy load, a neighbour that allows a query per row.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/../_shared/shipping-api.sh"
cat > app/shipping/adapters/orm.py <<'Y'
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.shared.db import Base


class ShipmentRow(Base):
    __tablename__ = "shipments"
    __table_args__ = (Index("ix_shipments_booked_at_id", "booked_at", "id"),)

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    consignee_name: Mapped[str] = mapped_column(String(200))
    postal_code: Mapped[str] = mapped_column(String(8))
    weight_grams: Mapped[int]
    status: Mapped[str] = mapped_column(String(16))
    carrier: Mapped[str | None] = mapped_column(String(16))
    booked_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    dispatched_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    delivered_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    version: Mapped[int] = mapped_column(default=1)
    labels: Mapped[list["LabelRow"]] = relationship(back_populates="shipment")

    __mapper_args__ = {"version_id_col": version}


class LabelRow(Base):
    __tablename__ = "labels"

    id: Mapped[int] = mapped_column(primary_key=True)
    shipment_id: Mapped[str] = mapped_column(ForeignKey("shipments.id"), index=True)
    printed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    shipment: Mapped[ShipmentRow] = relationship(back_populates="labels")
Y
git add -A && git commit -q -m "feat: shipping api"
