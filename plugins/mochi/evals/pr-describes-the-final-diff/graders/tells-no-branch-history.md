---
type: llm
---

PASS if the drafted pull request (its title, body, and self-review comments) describes only the final change: the cache may appear as an alternative that lost, but the draft does not tell the branch's history (a commit that added the cache, then one that removed or replaced it). Remarks to the user outside the draft do not count.
FAIL if the title, body, or a comment narrates the branch's history.
