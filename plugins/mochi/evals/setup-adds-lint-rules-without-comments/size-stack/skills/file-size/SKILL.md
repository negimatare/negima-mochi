---
name: file-size
description: File-size limits for React + Fluent UI source files, set as ESLint rules. Use when writing or splitting a React component or hook.
user-invocable: false
---

# File size

Source files warn past 200 lines; test files are exempt, one file per
behaviour suite. In the project's ESLint config:

```js
{
  files: ['src/**/*.{ts,tsx}'],
  rules: {
    'max-lines': ['warn', { max: 200, skipBlankLines: true, skipComments: true }],
  },
},
{
  files: ['src/**/*.test.{ts,tsx}'],
  rules: { 'max-lines': 'off' },
},
```
