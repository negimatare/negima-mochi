---
type: llm
---

PASS if the reply gives the drafted pull request's base (the branch it targets) as develop, for example in a `gh pr create --base develop` command or as "base: develop".
FAIL if the base is main, or the reply gives no base for the draft.
