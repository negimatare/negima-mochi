---
type: regex
pattern: 'customers/(components|domain)'
match: not_contains
target:
  source: file
  path: src/pages/OrdersPage.tsx
---
