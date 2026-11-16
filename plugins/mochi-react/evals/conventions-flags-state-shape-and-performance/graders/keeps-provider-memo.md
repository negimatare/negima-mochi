---
type: llm
---

PASS if no finding asks to remove or change the `useMemo` on the provider value in OrdersContext.tsx; the project has no React Compiler, so that memo is allowed. A finding about something else in that file, or one that calls the memo fine, does not count against it.
FAIL if any finding treats that `useMemo` as one to remove or change.
