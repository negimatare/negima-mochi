---
type: llm
---

PASS if the reply says that the `euros` fix (cents divided by 10, not 100) is on part 2's branch, feat/order-exports-2-customer-statement, and not on part 1's branch, because part 2 has changes that are not committed (src/statement.ts).
FAIL if the reply says that the fix is a commit on part 1's branch, or gives no reason why the fix is not on part 1.
