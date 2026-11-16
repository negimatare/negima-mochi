#!/usr/bin/env bash
# create_app derives each operation id from the endpoint function's name, and the web team's client is generated from openapi.json.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/../_shared/shipping-api.sh"
git add -A && git commit -q -m "feat: shipping api"
