---
type: llm
focus: trace
---

Judge only the code Claude wrote with Write, Edit or Bash, not skill text or files it read.

PASS if the code loads ReportsPage with React's `lazy`, called at module top level in whichever file Claude chose (such as src/App.tsx or the pages barrel), and adapts the named export, as in `lazy(() => import("./ReportsPage").then((module) => ({ default: module.ReportsPage })))`, and ReportsPage itself has no default export.
FAIL if ReportsPage is imported statically wherever it renders, if `lazy` is called inside a component or hook, if the import relies on a default export, or if ReportsPage is exported as default.
