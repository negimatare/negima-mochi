---
type: regex
target:
  source: file
  path: app/shipping/hold_shipment/endpoint.py
pattern: '(?:async )?def \w+\([\s\S]*?\)(?:\s*->\s*[^:\n]+)?:\s*\n\s+"""\s*\w|\bdescription\s*=\s*\S'
match: contains
---
