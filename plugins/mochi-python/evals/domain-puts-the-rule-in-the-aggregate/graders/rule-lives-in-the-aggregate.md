---
type: regex
pattern: 'raise \w*(Weight|Heavy|Limit|Kg)\w*'
flags: i
target:
  source: file
  path: app/shipping/domain/model.py
---
