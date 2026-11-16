---
type: regex
pattern: 'interface \w*(Values|Form)\b|type \w*Values\s*=\s*\{'
match: not_contains
target:
  source: file
  path: src/features/customers/components/CustomerForm/CustomerForm.tsx
---
