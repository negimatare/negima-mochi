---
type: regex
target:
  source: file
  path: src/features/orders/components/OrderList/OrderList.tsx
pattern: 'import \{[^}]*\buseVirtualizer\b[^}]*\} from ["'']@tanstack/react-virtual["'']'
match: contains
---
