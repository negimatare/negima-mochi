---
type: llm
---

PASS if the reply reports that no index serves the created_at filter, so each batch query reads the project's rows through (project_id, id) however narrow the window is, and ties that to the cost or to the 600 s read timeout.
FAIL if the reply does not report the missing index for the created_at filter.
