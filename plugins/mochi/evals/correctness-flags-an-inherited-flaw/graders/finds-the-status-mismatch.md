---
type: llm
---

PASS if the reply reports that toRecentRow takes the status from the published text while the exported text comes from the draft, so a row can disagree with itself (for example a draft that hides the text is exported as "" with status TRANSLATED) and does not match the dashboard download it claims to follow.
FAIL if the reply reports only that the code duplicates toUnlinkedRow, or accepts the logic because the older export does the same.
