---
type: llm
---

PASS if Claude updated openapi.json for the new route, or the reply says the spec must be regenerated with `uv run python -m scripts.export_openapi` (for example because it could not run it) and committed with the change.
FAIL if the reply neither updates openapi.json nor mentions that it needs regenerating.
