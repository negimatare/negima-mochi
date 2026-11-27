---
type: llm
---

PASS if the reply reports, as a problem to fix before merging, that getOrder in src/routes/orders.ts returns any order by its id without checking that it belongs to the signed-in customer, so one customer can read another's order.
FAIL if the reply does not report this, or reports it only as optional or a later improvement.
