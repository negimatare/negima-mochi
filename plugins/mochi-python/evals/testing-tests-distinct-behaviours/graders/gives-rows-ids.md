---
type: regex
pattern: 'parametrize\(\s*["\x27][^"\x27]*["\x27]\s*,\s*\[\s*\('
match: not_contains
target:
  source: file
  path: tests/shipping/test_consignee.py
---
