---
type: regex
pattern: 'is_returned|returned\w*\s*:\s*bool'
match: not_contains
target:
  source: file
  path: app/shipping/domain/model.py
---
