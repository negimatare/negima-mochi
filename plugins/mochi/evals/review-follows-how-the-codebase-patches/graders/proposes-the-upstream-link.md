---
type: llm
---

The new patch src/patches/slugify.patch.ts says "Remove this patch when slugify ships a fix" without naming an upstream issue, while the two existing patches each link theirs (money-format#88, csv-parse#412).

PASS if the reply's fix for how the slugify patch gets removed is, first, to file or find the upstream slugify issue and link it in the comment, as the existing patches do. A guard, a version check, or a test may appear only as an additional option.
FAIL if the reply raises nothing about how the patch gets removed, or if its main fix is a new mechanism (a guard, a version check, a runtime error, a test) without proposing the upstream link first.
