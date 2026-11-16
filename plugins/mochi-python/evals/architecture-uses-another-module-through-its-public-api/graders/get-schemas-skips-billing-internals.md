---
type: regex
pattern: 'app\.billing\.(domain|quote_price|adapters)'
match: not_contains
target:
  source: file
  path: app/shipping/get_shipment/schemas.py
---
