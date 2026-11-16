---
type: llm
---

PASS if the reply reports, graded 🔴 Critical or 🟠 High, that toRecentRow takes the status from the published text while exporting the draft, and says the same flaw is in src/exports/unlinked.ts.
FAIL if the reply grades this finding 🟡 Medium or 🔵 Minor, does not report it, or does not mention that unlinked.ts has it too.
