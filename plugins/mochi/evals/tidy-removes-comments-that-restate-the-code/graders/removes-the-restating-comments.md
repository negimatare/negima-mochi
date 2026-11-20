---
type: regex
pattern: '//\s*(Sum the order|One point per|Start from zero|Go through each|Only orders with|increment the count)'
flags: i
match: not_contains
target:
  source: file
  path: src/loyalty.ts
---
