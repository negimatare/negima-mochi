---
type: llm
---

PASS if no finding asks to remove, move, or rewrite the resize effect in useWindowWidth.ts, which subscribes to the window, an external system. A finding that calls the effect valid, or that is about something else in that file, does not count against it.
FAIL if any finding treats that effect as one to remove or replace.
