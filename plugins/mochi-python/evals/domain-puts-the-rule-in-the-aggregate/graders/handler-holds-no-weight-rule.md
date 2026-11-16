---
type: regex
pattern: '20[_,]?000|weight'
flags: i
match: not_contains
target:
  source: file
  path: app/shipping/dispatch_shipment/handler.py
---
