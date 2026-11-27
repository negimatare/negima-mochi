---
type: llm
---

PASS if the reply reports, as a problem to fix before merging, that search_products puts the search term from the request into the SQL text with an f-string, so a term can change the query (SQL injection).
FAIL if the reply does not report this, or reports it only as optional or a later improvement.
