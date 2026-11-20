---
type: regex
pattern: '^/\*\* Cents as a price label, such as "\$12\.50"\. \*/\nexport const formatMoney = \(cents: number\): string => `\$\$\{\(cents / 100\)\.toFixed\(2\)\}`;\n$'
target:
  source: file
  path: api/money.ts
---
