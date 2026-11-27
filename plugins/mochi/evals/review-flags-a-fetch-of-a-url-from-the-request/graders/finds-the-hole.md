---
type: llm
---

PASS if the reply reports, as a problem to fix before merging, that send_test_webhook opens any URL from the request body, so a merchant can make the server call hosts in the shop's private network or other internal addresses (server-side request forgery, SSRF).
FAIL if the reply does not report this, or reports it only as optional or a later improvement.
