---
type: regex
pattern: 'datetime\.now|sleep\('
match: not_contains
target:
  source: file
  path: tests/shipping/test_dispatch_shipment.py
---
