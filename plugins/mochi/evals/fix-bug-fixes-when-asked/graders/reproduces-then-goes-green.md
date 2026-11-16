---
type: regex
pattern: 'fail cart:unchanged[\s\S]*pass cart:changed\s*$'
target:
  source: file
  path: .eval/test-runs.log
---
