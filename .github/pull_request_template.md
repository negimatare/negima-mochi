## What and why

<!-- What the change does, and the problem it solves. -->

## Checklist

- [ ] A changed skill or agent has an eval case that fails on the old version
      ([Evals](https://github.com/negimatare/negima-mochi/blob/main/CONTRIBUTING.md#evals))
- [ ] `claude plugin validate` passes for each plugin whose manifest,
      frontmatter, or hook changed
- [ ] `node scripts/skill-map.mjs --check` passes
- [ ] Evals and fixtures use a made-up domain, not a real codebase
