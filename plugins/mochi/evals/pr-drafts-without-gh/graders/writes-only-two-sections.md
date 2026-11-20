---
type: regex
pattern: 'TL;DR(?:(?!gh pr create)[\s\S])*?^[> \t]*(#+[ \t]*)?\**(Risks?|Test(ing| plan)|Manual (checks|testing)|How to (review|test)|Reading order|Review asks|Links)\b'
flags: im
match: not_contains
---
