---
type: regex
pattern: '^\s*(from|import)\s+app\b'
flags: m
match: not_contains
target:
  source: file
  path: migrations/versions/0002_add_tracking_number.py
---
