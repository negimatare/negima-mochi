---
type: llm
---

PASS if the reply reports that the test's order already has status "shipped" before markShipped runs, so the test passes whether or not markShipped sets the status.
FAIL if the reply does not point out that the setup supplies the asserted status.
