---
type: regex
pattern: "(🔴|🟠|🟡|🔵)[^\\n]*src/discount\\.ts:\\d+[^\\n]*DISCOUNT_RULES_VERSION"
target:
  source: file
  path: .eval/review.md
---
