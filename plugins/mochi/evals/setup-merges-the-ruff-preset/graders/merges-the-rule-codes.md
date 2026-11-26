---
type: regex
target:
  source: file
  path: pyproject.toml
pattern: 'extend-select\s*=\s*\[(?=[^\]]*"ASYNC")(?=[^\]]*"S113")(?=[^\]]*"TID251")'
---
