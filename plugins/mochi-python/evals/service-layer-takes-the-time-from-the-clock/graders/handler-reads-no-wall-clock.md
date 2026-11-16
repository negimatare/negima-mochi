---
type: regex
pattern: 'datetime\.now|utcnow|time\.time\('
match: not_contains
target:
  source: file
  path: app/shipping/cancel_shipment/handler.py
---
