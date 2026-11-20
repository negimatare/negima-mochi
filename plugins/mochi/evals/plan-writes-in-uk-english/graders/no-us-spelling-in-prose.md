---
type: regex
pattern: '^(?:(?!```)(?:[^`"\n]|`[^`\n]*`|"[^"\n]*"|[`"](?=[^`"\n]*(?:\n|$)))*\n|```[^\n]*\n(?:(?!```)[^\n]*\n)*```[^\n]*(?:\n|$))*?(?:(?!```)(?:[^`"\n]|`[^`\n]*`|"[^"\n]*"|[`"](?=[^`"\n]*(?:\n|$))))*?(?<![\w`])(favorite|color|organiz|behavior)\w*'
flags: i
match: not_contains
target:
  source: file
  path: .eval/plan.md
---
