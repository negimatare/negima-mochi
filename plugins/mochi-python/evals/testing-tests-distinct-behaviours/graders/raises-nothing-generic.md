---
type: regex
pattern: 'pytest\.raises\(\s*(ValueError|Exception)\b'
match: not_contains
target:
  source: file
  path: tests/shipping/test_consignee.py
---
