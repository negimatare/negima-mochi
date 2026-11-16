---
type: regex
pattern: 'isLoading|setIsLoading|setError\(|useState<\w*Error'
match: not_contains
target:
  source: file
  path: src/features/orders/hooks/useOrder.ts
---
