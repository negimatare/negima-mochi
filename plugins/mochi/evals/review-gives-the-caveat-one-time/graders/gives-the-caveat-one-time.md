---
type: regex
target: trace
pattern: '^\{"type":"assistant"[^\n]*"type":"text"[^\n]*(?:as (?:the )?reviewers? (?:gave|reported)|against the code before|not yet (?:checked|verified))[^\n]*\n[\s\S]*^\{"type":"assistant"[^\n]*"type":"text"[^\n]*(?:as (?:the )?reviewers? (?:gave|reported)|against the code before|not yet (?:checked|verified))'
flags: mi
match: not_contains
---
