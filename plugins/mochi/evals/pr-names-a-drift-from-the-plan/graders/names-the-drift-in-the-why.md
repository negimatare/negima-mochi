---
type: llm
---

PASS if the Why of the drafted pull request body says that the shipping fee is in src/cart.ts and not in the src/pricing.ts module that the plan gave, and gives the reason from the commit message (the fee is one function that only the cart calls, or the checkout team wants one import for the cart).
FAIL if the draft does not say that the code departs from the plan, or says so with no reason.
