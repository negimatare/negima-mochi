---
type: regex
pattern: '## Slices\s*\n\d+\. [\s\S]{0,400}?\(~\d+ lines\)'
target:
  source: file
  path: .eval/plan.md
---
