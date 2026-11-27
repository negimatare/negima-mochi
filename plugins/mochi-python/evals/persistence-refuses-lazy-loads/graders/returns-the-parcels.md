---
type: regex
target:
  source: file
  path: app/shipping/get_shipment/handler.py
pattern: '^[^#\n]*(\bparcels\s*=|\.parcels\b)'
flags: m
match: contains
---
