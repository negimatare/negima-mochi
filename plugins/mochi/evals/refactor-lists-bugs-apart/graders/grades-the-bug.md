---
type: regex
target:
  source: file
  path: .eval/working-files.txt
pattern: '(🔴 Critical|🟠 High)\s+\S*refund\.ts:\d+'
match: contains
arm: with-only
---
