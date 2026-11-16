---
type: regex
pattern: 'class \w*(Weight|Heavy|Limit|Kg)\w*\(Conflict\)'
flags: i
target:
  source: file
  path: app/shipping/domain/exceptions.py
---
