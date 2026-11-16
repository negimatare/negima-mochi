---
type: regex
pattern: 'nullable\s*=\s*False'
match: not_contains
target:
  source: file
  path: migrations/versions/0002_add_tracking_number.py
---
