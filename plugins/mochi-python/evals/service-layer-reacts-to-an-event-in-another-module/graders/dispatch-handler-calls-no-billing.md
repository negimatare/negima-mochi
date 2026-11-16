---
type: regex
pattern: 'billing'
flags: i
match: not_contains
target:
  source: file
  path: app/shipping/dispatch_shipment/handler.py
---
