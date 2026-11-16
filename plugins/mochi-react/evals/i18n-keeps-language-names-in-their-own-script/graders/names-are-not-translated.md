---
type: regex
pattern: 't\(\s*[\"\x27`][\w.]*(languages|english|japanese)'
flags: i
match: not_contains
target:
  source: file
  path: src/features/settings/components/LanguageSwitcher/LanguageSwitcher.tsx
---
