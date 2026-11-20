---
type: llm
---

PASS if the reply says that the fix to `euros` (cents divided by 10, not 100) is a commit on part 1's branch, feat/order-exports-1-monthly-csv, that part 2's branch is rebased onto it, that nothing is pushed, and that `/mochi:pr` pushes the restacked branches.
FAIL if the reply says that the fix is only on part 2's branch or not committed, says that it pushed a branch, or gives no next step that pushes the two branches.
