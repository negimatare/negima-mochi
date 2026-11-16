#!/usr/bin/env bash
# test_tariff.py is a parametrize table whose rows take one branch, with bare tuples and no ids, a neighbour to copy.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/../_shared/shipping-api.sh"
cat > tests/billing/test_tariff.py <<'Y'
import pytest

from app.billing.domain import price_for


@pytest.mark.parametrize("weight, expected", [(100, 800), (500, 800), (999, 800), (1000, 800)])
def test_price(weight: int, expected: int) -> None:
    assert price_for(weight) == expected
Y
git add -A && git commit -q -m "feat: shipping api"
