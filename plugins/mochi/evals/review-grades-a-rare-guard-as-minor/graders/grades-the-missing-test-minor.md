---
type: llm
---

Look only at the finding, if any, that the new `replayedAfterRestart` guard (a job that a restart replays) has no test. Ignore every other finding.
PASS if the reply does not report that finding, or grades it 🔵 Minor and its fix says that no test is needed (or that a test is optional).
FAIL if the reply grades that finding 🔴 Critical, 🟠 High, or 🟡 Medium, or reports it with a fix that asks for a test.
