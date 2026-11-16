---
type: regex
pattern: 'prices\.reduce\(\(sum, price\) => sum \+ price, 0\);\s*$'
target:
  source: file
  path: src/cart.ts
---
