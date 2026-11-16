---
type: regex
pattern: "(^|\\s)(//|/\\*)"
flags: m
match: not_contains
target:
  source: file
  path: eslint.config.js
---
