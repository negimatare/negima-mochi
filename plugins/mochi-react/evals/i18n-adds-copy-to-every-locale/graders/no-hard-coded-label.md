---
type: regex
pattern: '>\s*Refresh\s*<|[\"\x27]Refresh[\"\x27]'
match: not_contains
target:
  source: file
  path: src/features/orders/components/OrdersToolbar/OrdersToolbar.tsx
---
