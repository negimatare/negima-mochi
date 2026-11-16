---
type: regex
pattern: 'problem_response\(\s*"[^"]*suspend'
flags: i
target:
  source: file
  path: app/shipping/dispatch_shipment/endpoint.py
---
