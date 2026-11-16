---
type: regex
pattern: 'timeout:\s*\d{4,}|new Promise\(\(?\w*\)?\s*=>\s*setTimeout'
match: not_contains
target:
  source: file
  path: src/features/orders/components/AutoRefresh/AutoRefresh.test.tsx
---
