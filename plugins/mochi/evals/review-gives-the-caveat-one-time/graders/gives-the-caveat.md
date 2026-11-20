---
type: regex
target: trace
pattern: '^\{"type":"assistant"(?![^\n]*"parent_tool_use_id":")[^\n]*"type":"text"[^\n]*(?:as (?:the )?reviewers? (?:gave|reported)|against the code before|not yet (?:checked|verified))'
flags: mi
---
