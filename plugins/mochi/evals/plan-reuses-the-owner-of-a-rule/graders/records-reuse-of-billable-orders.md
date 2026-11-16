---
type: regex
pattern: "Existing solution:\\W*(reuse|change|extract)\\b[\\s\\S]{0,300}?billableOrders"
flags: i
target:
  source: file
  path: .eval/plan.md
---
