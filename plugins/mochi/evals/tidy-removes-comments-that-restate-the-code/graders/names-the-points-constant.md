---
type: regex
pattern: 'const\s+\w+\s*(:\s*number\s*)?=\s*(1_?000|1e3)\b'
target:
  source: file
  path: src/loyalty.ts
---
