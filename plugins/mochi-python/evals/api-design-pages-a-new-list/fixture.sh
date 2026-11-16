#!/usr/bin/env bash
# No list_shipments yet; billing's list_rates returns list[...] with offset and a limit of 1000, a neighbour that pages badly.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/../_shared/shipping-api.sh"
rm -r app/shipping/list_shipments
perl -0pi -e 's/from \.list_shipments import router as list_shipments_router\n//; s/router\.include_router\(list_shipments_router, prefix="\/shipments"\)\n//' app/shipping/__init__.py
perl -0pi -e 's/ \| list_shipments//' pyproject.toml
python3 -I - <<'PY'
import json, pathlib
path = pathlib.Path("openapi.json")
spec = json.loads(path.read_text())
del spec["paths"]["/api/v1/shipments"]["get"]
for name in ("ShipmentPage", "ShipmentSummary"):
    del spec["components"]["schemas"][name]
path.write_text(json.dumps(spec, indent=2, ensure_ascii=False) + "\n")
PY
mkdir -p app/billing/list_rates
cat > app/billing/list_rates/endpoint.py <<'Y'
from fastapi import APIRouter

from app.shared.schemas import ApiSchema

from ..domain import price_for

router = APIRouter()


class RateResponse(ApiSchema):
    up_to_grams: int
    price_yen: int


@router.get("", summary="List rates")
async def list_rates(offset: int = 0, limit: int = 1000) -> list[RateResponse]:
    """Lists the price for each started kilogram up to 30 kg."""
    rates = [RateResponse(up_to_grams=kg * 1000, price_yen=price_for(kg * 1000)) for kg in range(1, 31)]
    return rates[offset : offset + limit]
Y
printf 'from .endpoint import router\n\n__all__ = ["router"]\n' > app/billing/list_rates/__init__.py
cat > app/billing/__init__.py <<'Y'
from fastapi import APIRouter

from .get_quote import quote_price
from .get_quote import router as get_quote_router
from .list_rates import router as list_rates_router

router = APIRouter(tags=["billing"])
router.include_router(get_quote_router, prefix="/quotes")
router.include_router(list_rates_router, prefix="/rates")

__all__ = ["quote_price", "router"]
Y
perl -0pi -e 's/    "get_quote",\n/    "get_quote | list_rates",\n/' pyproject.toml
git add -A && git commit -q -m "feat: shipping api"
