---
type: regex
pattern: '\.offset\(|OFFSET'
match: not_contains
target:
  source: file
  path: app/shipping/list_shipments/handler.py
---
