---
type: regex
target:
  source: file
  path: app/shipping/hold_shipment/endpoint.py
pattern: '@router\.\w+\((?:[^()]|\([^()]*\))*\)\s*\n(?:async )?def \w+\((?:[^()]|\([^()]*\))*\)(?:\s*->\s*[^:\n]+)?:\s*\n\s+"""\s*\w|@router\.\w+\((?:[^()]|\([^()]*\))*\bdescription\s*='
match: contains
---
