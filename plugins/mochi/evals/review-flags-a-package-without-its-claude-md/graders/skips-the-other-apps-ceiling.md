---
type: regex
pattern: '^- \[.\] .*\b120\b'
flags: m
match: not_contains
target:
  source: file
  path: .eval/review.md
---
