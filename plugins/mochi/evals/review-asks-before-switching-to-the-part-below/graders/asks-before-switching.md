---
type: llm
---

PASS if the reply ends with a question that asks whether it can switch to part 1's branch (feat/order-exports-1-monthly-csv) to fix the `euros` bug (cents divided by 10, not 100) there.
FAIL if the reply says that it committed the fix on part 1's branch, or does not ask before the switch.
