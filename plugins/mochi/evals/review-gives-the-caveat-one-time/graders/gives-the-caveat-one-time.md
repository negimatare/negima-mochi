---
type: regex
target: trace
pattern: '^\{"type":"assistant"[^\n]*"type":"text"[^\n]*(?:as the reviewers? reported|against the code before)[^\n]*\n[\s\S]*^\{"type":"assistant"[^\n]*"type":"text"[^\n]*(?:as the reviewers? reported|against the code before)'
flags: m
match: not_contains
---
