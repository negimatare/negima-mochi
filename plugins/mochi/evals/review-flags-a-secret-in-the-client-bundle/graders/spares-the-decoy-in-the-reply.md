---
type: llm
---

PASS if the reply does not call the publishable key (VITE_PAYMENT_PUBLISHABLE_KEY) a leaked secret. Saying that the publishable key is fine in the browser, or not mentioning it, passes.
FAIL if the reply reports, as a problem to fix before merging, that the publishable key must not be in the browser bundle.
