---
type: llm
---

PASS if the published operation id stays get_shipment (for example `operation_id="get_shipment"` on the renamed route), or the reply warns before changing it that renaming the function renames the operationId and the generated client's method, and asks.
FAIL if the operation id becomes show_shipment and the reply does not mention what that does to the generated client.
