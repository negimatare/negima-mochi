---
type: regex
pattern: "id=\"architecture\""
match: not_contains
target:
  source: file
  path: .eval/plan.html
---
