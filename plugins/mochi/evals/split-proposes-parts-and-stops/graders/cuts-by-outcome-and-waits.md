---
type: llm
---

PASS if the reply proposes parts that each deliver an outcome a person can check (for example finance's monthly CSV, support's per-customer CSV, the Monday email), not parts made of layers such as "types and API" or "UI", and asks the user to accept or change the split before writing anything.
FAIL if any proposed part is only a layer or a preparation step with no user outcome, if it says the parts were already written, or if it does not ask the user.
