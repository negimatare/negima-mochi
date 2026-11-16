---
type: regex
pattern: 'mock|patch\('
flags: i
match: not_contains
target:
  source: file
  path: tests/shipping/test_dispatch_shipment.py
---
