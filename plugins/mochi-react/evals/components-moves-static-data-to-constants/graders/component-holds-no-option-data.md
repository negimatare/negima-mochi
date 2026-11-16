---
type: regex
pattern: 'Overnight|Freight|\b19\b|\b49\b'
flags: i
match: not_contains
target:
  source: file
  path: src/features/orders/components/ShippingMethodPicker/ShippingMethodPicker.tsx
---
