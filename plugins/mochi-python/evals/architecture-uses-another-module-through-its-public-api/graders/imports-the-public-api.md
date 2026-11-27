---
type: regex
target:
  source: file
  path: app/shipping/get_shipment/handler.py
pattern: '^from app\.billing import'
flags: m
match: contains
---
