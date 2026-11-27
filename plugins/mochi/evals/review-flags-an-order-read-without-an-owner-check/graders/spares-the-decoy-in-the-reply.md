---
type: llm
---

PASS if the reply does not call getInvoice in src/routes/invoices.ts a security hole or an authorization problem. A remark on its style, its tests or its status code is fine.
FAIL if the reply reports that getInvoice lets a customer read an invoice that is not theirs.
