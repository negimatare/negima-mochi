---
type: regex
pattern: 'formatOrderTotal[^;]*from [\"\x27][^\"\x27]*(utils|common|lib|helpers|shared)'
match: not_contains
target:
  source: file
  path: src/features/orders/components/OrderList/OrderList.tsx
---
