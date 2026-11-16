---
type: tool_order
before:
  tool: Bash
  input_match: 'npm (run )?test'
after:
  tool: Bash
  input_match: 'git commit'
---
