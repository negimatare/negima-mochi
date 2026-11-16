---
type: regex
pattern: 'parcels[^=\n]*=\s*relationship\((?![^)]*lazy\s*=\s*["\x27]raise)[^)]*\)'
match: not_contains
target:
  source: file
  path: app/shipping/adapters/orm.py
---
