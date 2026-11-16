---
name: dependencies
description: Supply-chain policy for adding or upgrading any package (npm, PyPI, or other registries) — vet the exact version before installing and review the lockfile diff. Use whenever a change adds, upgrades, or replaces a dependency.
user-invocable: false
paths:
  - "**/package.json"
  - "**/pyproject.toml"
  - "**/requirements*.txt"
---

# Dependencies

Compromised packages ship credential stealers and self-propagating payloads
that run on install and tamper with developer tooling. Adding a dependency is a
security decision.

> Install the latest **safe** version, and verify it before adding it. A release
> from the last day or two is the riskiest window.

## Before adding

1. **Prefer what the organisation already uses.** The project's `CLAUDE.md`
   names sibling projects to check; match an already-vetted choice where
   reasonable.
2. **Minimise the surface.** Do not add a package for something the platform
   already provides; fewer packages means fewer transitive dependencies.
3. **Verify the exact version** against the registry (`npm view <pkg>@<v>`,
   `https://registry.npmjs.org/<pkg>/<v>`, or the PyPI JSON API):
   - not deprecated, maintained by the established publishers;
   - published days ago, not hours;
   - no `preinstall` / `install` / `postinstall` script;
   - not listed by an active-campaign tracker such as Socket.dev.
4. **Pin and review the lockfile diff.** Only the expected packages may enter
   the tree; a surprise transitive dependency is a red flag.

## After adding

Run the project's verification commands, and record why a non-obvious version
was chosen in the commit message.
