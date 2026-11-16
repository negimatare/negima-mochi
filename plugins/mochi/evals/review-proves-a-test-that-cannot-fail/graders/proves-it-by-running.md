---
type: llm
---

PASS if the reply reports that the 2026-02-30 assertion passes even without the calendar check, because the date then rolls over into a reversed range, and says this was confirmed by running the test with the check removed.
FAIL if the reply does not report the assertion, or reports it without having run the test.
