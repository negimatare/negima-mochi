---
type: llm
---

PASS if the reply says part 2 is built on a branch cut from part 1's branch (feat/order-exports-1-monthly-csv), and the next step it gives opens the pull request against that branch, for example `/mochi:pr feat/order-exports-1-monthly-csv`. Saying that part 2 must merge after part 1 is correct for a stack and still passes.
FAIL if the reply says it did not build part 2 because part 1 is not merged, says part 2 was built from main, or gives a next step that opens the pull request against main.
