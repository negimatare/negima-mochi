#!/usr/bin/env bash
# On the branch, GET /shipments/{id} renames consigneeName to recipientName in v1, and openapi.json follows.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/../_shared/shipping-api.sh"
git add -A && git commit -q -m "feat: shipping api"
git switch -q -c rename-consignee
perl -0pi -e 's/    consignee_name: str\n/    recipient_name: str\n/' app/shipping/get_shipment/schemas.py
perl -0pi -e 's/        consignee_name=row\.consignee_name,\n/        recipient_name=row.consignee_name,\n/' app/shipping/get_shipment/handler.py
python3 -I - <<'PY'
import json, pathlib
path = pathlib.Path("openapi.json")
spec = json.loads(path.read_text())
schema = spec["components"]["schemas"]["ShipmentResponse"]
schema["properties"] = {("recipientName" if k == "consigneeName" else k): v for k, v in schema["properties"].items()}
schema["properties"]["recipientName"]["title"] = "Recipientname"
schema["required"] = ["recipientName" if k == "consigneeName" else k for k in schema["required"]]
path.write_text(json.dumps(spec, indent=2, ensure_ascii=False) + "\n")
PY
git add -A && git commit -q -m "refactor: call the consignee the recipient"
