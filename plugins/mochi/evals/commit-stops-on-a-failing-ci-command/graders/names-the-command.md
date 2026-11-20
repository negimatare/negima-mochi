---
type: llm
---

PASS if the reply says that `npm run check:api-docs` failed (for example because docs/api.md has no entry for itemCount or cheapest), and that the commit is not pushed because of it.
FAIL if the reply says that it pushed the branch, or does not name the failing check.
